import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import BetterSqlite3DatabaseSnapshot from '@infrastructure/database/better-sqlite3/better-sqlite3-database-snapshot';
import Database from 'better-sqlite3';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDirectory: string | null = null;
let sourceDatabase: Database.Database | null = null;
let sourceDatabaseFile: string | null = null;
let snapshotFile: string | null = null;

describe('BetterSqlite3DatabaseSnapshot', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-backup-snapshot-'));
    sourceDatabaseFile = join(tempDirectory, 'source.sqlite');
    snapshotFile = join(tempDirectory, 'backup', 'snapshot.sqlite');
    sourceDatabase = new Database(sourceDatabaseFile);
    sourceDatabase.pragma('journal_mode = WAL');
    sourceDatabase.pragma('wal_autocheckpoint = 0');

    sourceDatabase.exec(`
          CREATE TABLE example (
            id INTEGER PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

    sourceDatabase
      .prepare(
        `
              INSERT INTO example (
                id,
                value
              )
              VALUES (
                ?,
                ?
              )
            `,
      )
      .run(1, 'antes del snapshot');
  });

  afterEach(async (): Promise<void> => {
    if (sourceDatabase !== null) {
      sourceDatabase.close();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    sourceDatabase = null;
    sourceDatabaseFile = null;
    snapshotFile = null;
    tempDirectory = null;
  });

  it('crea un snapshot consistente de una base activa en WAL', async (): Promise<void> => {
    const currentSourceFile: string = requireSourceDatabaseFile();
    const currentSnapshotFile: string = requireSnapshotFile();

    expect(await fileExists(`${currentSourceFile}-wal`)).toBe(true);

    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      currentSourceFile,
      new TestApplicationLogger(),
    );

    await snapshot.create(currentSnapshotFile);

    const backupDatabase: Database.Database = new Database(currentSnapshotFile, {
      readonly: true,
      fileMustExist: true,
    });

    try {
      const rows: readonly {
        readonly id: number;
        readonly value: string;
      }[] = backupDatabase
        .prepare(
          `
                    SELECT
                      id,
                      value
                    FROM example
                    ORDER BY id
                  `,
        )
        .all() as readonly {
        readonly id: number;
        readonly value: string;
      }[];

      expect(rows).toEqual([
        {
          id: 1,
          value: 'antes del snapshot',
        },
      ]);

      expect(
        backupDatabase.pragma('integrity_check', {
          simple: true,
        }),
      ).toBe('ok');
    } finally {
      backupDatabase.close();
    }
  });

  it('produce una copia independiente de cambios posteriores', async (): Promise<void> => {
    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      requireSourceDatabaseFile(),
      new TestApplicationLogger(),
    );

    await snapshot.create(requireSnapshotFile());

    requireSourceDatabase()
      .prepare(
        `
              INSERT INTO example (
                id,
                value
              )
              VALUES (
                ?,
                ?
              )
            `,
      )
      .run(2, 'después del snapshot');

    const backupDatabase: Database.Database = new Database(requireSnapshotFile(), {
      readonly: true,
      fileMustExist: true,
    });

    try {
      const rows: readonly {
        readonly id: number;
      }[] = backupDatabase
        .prepare(
          `
                    SELECT id
                    FROM example
                    ORDER BY id
                  `,
        )
        .all() as readonly {
        readonly id: number;
      }[];

      expect(rows).toEqual([
        {
          id: 1,
        },
      ]);
    } finally {
      backupDatabase.close();
    }
  });

  it('no permite utilizar la base origen como destino', async (): Promise<void> => {
    const sourceFile: string = requireSourceDatabaseFile();
    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      sourceFile,
      new TestApplicationLogger(),
    );

    await expect(snapshot.create(sourceFile)).rejects.toThrow('no puede utilizarse como destino');
  });

  it('no sobrescribe un fichero de destino existente', async (): Promise<void> => {
    const destinationFile: string = requireSnapshotFile();

    await mkdir(join(requireTempDirectory(), 'backup'), {
      recursive: true,
    });

    await writeFile(destinationFile, 'contenido existente', {
      encoding: 'utf8',
    });

    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      requireSourceDatabaseFile(),
      new TestApplicationLogger(),
    );

    await expect(snapshot.create(destinationFile)).rejects.toThrow(
      'destino del snapshot ya existe',
    );

    expect(
      await readFile(destinationFile, {
        encoding: 'utf8',
      }),
    ).toBe('contenido existente');
  });

  it('propaga errores distintos de ENOENT al comprobar el destino', async (): Promise<void> => {
    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      requireSourceDatabaseFile(),
      new TestApplicationLogger(),
    );

    const invalidDestinationFile: string = `${requireSnapshotFile()}\0`;

    await expect(snapshot.create(invalidDestinationFile)).rejects.toBeInstanceOf(TypeError);
  });

  it('falla limpiamente si la base origen no existe', async (): Promise<void> => {
    const missingSource: string = join(requireTempDirectory(), 'missing.sqlite');
    const destinationFile: string = join(requireTempDirectory(), 'missing-backup.sqlite');

    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      missingSource,
      new TestApplicationLogger(),
    );

    await expect(snapshot.create(destinationFile)).rejects.toThrow(
      'No se ha podido crear el snapshot SQLite',
    );

    expect(await fileExists(destinationFile)).toBe(false);
  });

  it('registra un fallo de cleanup sin ocultar el error principal del snapshot', async (): Promise<void> => {
    const missingSource: string = join(requireTempDirectory(), 'missing-cleanup.sqlite');
    const destinationFile: string = join(requireTempDirectory(), 'failed-cleanup.sqlite');

    const logger: TestApplicationLogger = new TestApplicationLogger();

    const cleanupError: Error = new Error('Fallo simulado eliminando snapshot temporal.');

    const removedFiles: string[] = [];

    const removeFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      removedFiles.push(filePath);

      expect(options.force).toBe(true);

      throw cleanupError;
    };

    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      missingSource,
      logger,
      removeFile,
    );

    let snapshotError: unknown;

    try {
      await snapshot.create(destinationFile);
    } catch (error: unknown) {
      snapshotError = error;
    }

    expect(snapshotError).toBeInstanceOf(Error);

    if (!(snapshotError instanceof Error)) {
      throw new Error('Se esperaba un error de creación del snapshot.');
    }

    expect(snapshotError.message).toBe(
      'No se ha podido crear el snapshot SQLite de la copia de seguridad.',
    );

    expect(snapshotError.cause).toBeInstanceOf(Error);
    expect(snapshotError.cause).not.toBe(cleanupError);

    expect(removedFiles).toHaveLength(1);
    expect(removedFiles[0]).toMatch(/\.sqlite-backup-[0-9a-f-]+\.tmp$/i);

    expect(logger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'backup-sqlite-snapshot-temp-cleanup',
        message: 'No se ha podido limpiar el snapshot SQLite temporal de una copia de seguridad.',
        error: cleanupError,
      },
    ]);

    expect(logger.warnEvents[0].context).toBeUndefined();
  });

  it('conserva el resultado correcto del snapshot cuando falla el cierre SQLite', async (): Promise<void> => {
    const logger: TestApplicationLogger = new TestApplicationLogger();
    const closeError: Error = new Error('Fallo simulado cerrando SQLite.');

    const originalClose = Database.prototype.close;

    const closeSpy = vi.spyOn(Database.prototype, 'close').mockImplementationOnce(function (
      this: Database.Database,
    ): Database.Database {
      originalClose.call(this);

      throw closeError;
    });

    try {
      const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
        requireSourceDatabaseFile(),
        logger,
      );

      const destinationFile: string = requireSnapshotFile();

      await expect(snapshot.create(destinationFile)).resolves.toBeUndefined();

      expect(await fileExists(destinationFile)).toBe(true);

      expect(logger.warnEvents).toEqual([
        {
          area: 'backup',
          operation: 'backup-sqlite-snapshot-close',
          message: 'No se ha podido cerrar la conexión SQLite utilizada para generar el snapshot.',
          error: closeError,
        },
      ]);

      expect(logger.warnEvents[0].context).toBeUndefined();
    } finally {
      closeSpy.mockRestore();
    }
  });

  it('preserva el error principal si fallan el backup y el cierre SQLite', async (): Promise<void> => {
    const logger: TestApplicationLogger = new TestApplicationLogger();

    const backupError: Error = new Error('Fallo simulado generando el snapshot.');
    const closeError: Error = new Error('Fallo simulado cerrando SQLite.');

    const backupSpy = vi.spyOn(Database.prototype, 'backup').mockRejectedValueOnce(backupError);

    const originalClose = Database.prototype.close;

    const closeSpy = vi.spyOn(Database.prototype, 'close').mockImplementationOnce(function (
      this: Database.Database,
    ): Database.Database {
      originalClose.call(this);

      throw closeError;
    });

    try {
      const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
        requireSourceDatabaseFile(),
        logger,
      );

      let snapshotError: unknown;

      try {
        await snapshot.create(requireSnapshotFile());
      } catch (error: unknown) {
        snapshotError = error;
      }

      expect(snapshotError).toBeInstanceOf(Error);

      if (!(snapshotError instanceof Error)) {
        throw new Error('Se esperaba el error principal de creación del snapshot.');
      }

      expect(snapshotError.message).toBe(
        'No se ha podido crear el snapshot SQLite de la copia de seguridad.',
      );

      expect(snapshotError.cause).toBe(backupError);

      expect(logger.warnEvents).toEqual([
        {
          area: 'backup',
          operation: 'backup-sqlite-snapshot-close',
          message: 'No se ha podido cerrar la conexión SQLite utilizada para generar el snapshot.',
          error: closeError,
        },
      ]);

      expect(logger.warnEvents[0].context).toBeUndefined();
    } finally {
      backupSpy.mockRestore();
      closeSpy.mockRestore();
    }
  });
});

/**
 * Comprueba si existe un fichero
 * sin propagar ENOENT.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve la conexión SQLite origen
 * inicializada para el test.
 */
function requireSourceDatabase(): Database.Database {
  if (sourceDatabase === null) {
    throw new Error('La base SQLite origen no está inicializada.');
  }

  return sourceDatabase;
}

/**
 * Devuelve la ruta de la base SQLite
 * origen inicializada para el test.
 */
function requireSourceDatabaseFile(): string {
  if (sourceDatabaseFile === null) {
    throw new Error('La ruta de la base origen no está inicializada.');
  }

  return sourceDatabaseFile;
}

/**
 * Devuelve la ruta de snapshot
 * inicializada para el test.
 */
function requireSnapshotFile(): string {
  if (snapshotFile === null) {
    throw new Error('La ruta del snapshot no está inicializada.');
  }

  return snapshotFile;
}

/**
 * Devuelve el directorio temporal
 * inicializado para el test.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}

/**
 * Logger de pruebas que conserva los avisos
 * producidos durante la creación de snapshots.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva avisos para su verificación.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores no utilizados en estas pruebas.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}
