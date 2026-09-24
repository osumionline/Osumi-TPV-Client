import BetterSqlite3DatabaseSnapshot from '@infrastructure/database/better-sqlite3/better-sqlite3-database-snapshot';
import Database from 'better-sqlite3';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(sourceFile);

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

  it('falla limpiamente si la base origen no existe', async (): Promise<void> => {
    const missingSource: string = join(requireTempDirectory(), 'missing.sqlite');
    const destinationFile: string = join(requireTempDirectory(), 'missing-backup.sqlite');

    const snapshot: BetterSqlite3DatabaseSnapshot = new BetterSqlite3DatabaseSnapshot(
      missingSource,
    );

    await expect(snapshot.create(destinationFile)).rejects.toThrow(
      'No se ha podido crear el snapshot SQLite',
    );

    expect(await fileExists(destinationFile)).toBe(false);
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
