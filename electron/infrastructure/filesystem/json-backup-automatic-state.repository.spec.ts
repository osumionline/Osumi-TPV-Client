import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import JsonBackupAutomaticStateRepository from '@infrastructure/filesystem/json-backup-automatic-state.repository';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationLogger: TestApplicationLogger;

describe('JsonBackupAutomaticStateRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-backup-automatic-state-'));
    applicationLogger = new TestApplicationLogger();
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('devuelve null cuando todavía no existe estado', async (): Promise<void> => {
    const repository: JsonBackupAutomaticStateRepository = new JsonBackupAutomaticStateRepository(
      createFilePath(),
      applicationLogger,
    );

    await expect(repository.load()).resolves.toBeNull();
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('guarda y recupera el último éxito', async (): Promise<void> => {
    const filePath: string = createFilePath();

    const repository: JsonBackupAutomaticStateRepository = new JsonBackupAutomaticStateRepository(
      filePath,
      applicationLogger,
    );

    const state: BackupAutomaticState = {
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    };

    await repository.save(state);

    await expect(repository.load()).resolves.toEqual(state);

    const persisted: unknown = JSON.parse(
      await readFile(filePath, {
        encoding: 'utf8',
      }),
    );

    expect(persisted).toEqual(state);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('sustituye el estado anterior', async (): Promise<void> => {
    const repository: JsonBackupAutomaticStateRepository = new JsonBackupAutomaticStateRepository(
      createFilePath(),
      applicationLogger,
    );

    await repository.save({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-06T01:05:00.000Z',
    });

    await repository.save({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    });

    await expect(repository.load()).resolves.toEqual({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    });
  });

  it('no deja el fichero temporal después de guardar', async (): Promise<void> => {
    const filePath: string = createFilePath();

    const repository: JsonBackupAutomaticStateRepository = new JsonBackupAutomaticStateRepository(
      filePath,
      applicationLogger,
    );

    await repository.save({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    });

    await expect(access(`${filePath}.tmp`)).rejects.toThrow();
  });

  it('registra y trata un JSON corrupto como ausencia de estado', async (): Promise<void> => {
    const filePath: string = createFilePath();

    await writeFile(filePath, '{"schemaVersion":', {
      encoding: 'utf8',
    });

    const repository = new JsonBackupAutomaticStateRepository(filePath, applicationLogger);

    await expect(repository.load()).resolves.toBeNull();

    expect(applicationLogger.warnEvents).toHaveLength(1);

    expect(applicationLogger.warnEvents[0]).toMatchObject({
      area: 'backup',
      operation: 'load-automatic-backup-state',
      message: 'El estado persistido de las copias automáticas contiene un JSON no válido.',
      error: expect.any(Error),
    });
  });

  it('registra y trata una estructura desconocida como ausencia de estado', async (): Promise<void> => {
    const filePath: string = createFilePath();

    await writeFile(
      filePath,
      `${JSON.stringify(
        {
          schemaVersion: 2,
          lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
        },
        null,
        2,
      )}\n`,
      {
        encoding: 'utf8',
      },
    );

    const repository = new JsonBackupAutomaticStateRepository(filePath, applicationLogger);

    await expect(repository.load()).resolves.toBeNull();

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'load-automatic-backup-state',
        message: 'El estado persistido de las copias automáticas tiene una estructura no válida.',
      },
    ]);
  });

  it('registra y rechaza como estado válido una fecha no canónica', async (): Promise<void> => {
    const filePath: string = createFilePath();

    await writeFile(
      filePath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          lastSuccessfulAt: '2026-10-07 01:05:00',
        },
        null,
        2,
      )}\n`,
      {
        encoding: 'utf8',
      },
    );

    const repository = new JsonBackupAutomaticStateRepository(filePath, applicationLogger);

    await expect(repository.load()).resolves.toBeNull();

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'load-automatic-backup-state',
        message: 'El estado persistido de las copias automáticas tiene una estructura no válida.',
      },
    ]);
  });

  it('elimina el estado y cualquier temporal pendiente', async (): Promise<void> => {
    const filePath: string = createFilePath();

    const repository: JsonBackupAutomaticStateRepository = new JsonBackupAutomaticStateRepository(
      filePath,
      applicationLogger,
    );

    await repository.save({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    });

    await writeFile(`${filePath}.tmp`, 'temporal', {
      encoding: 'utf8',
    });

    await repository.delete();

    await expect(access(filePath)).rejects.toThrow();
    await expect(access(`${filePath}.tmp`)).rejects.toThrow();
    await expect(repository.load()).resolves.toBeNull();
  });
});

/**
 * Construye la ruta del fichero utilizada
 * por el test actual.
 */
function createFilePath(): string {
  return join(requireTempDirectory(), 'backup_automatic_state.json');
}

/**
 * Devuelve obligatoriamente el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}

/**
 * Logger controlado utilizado por las pruebas
 * del estado automático persistido.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora eventos de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora eventos informativos.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva avisos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
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
