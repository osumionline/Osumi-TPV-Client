import type { ApplicationLogRecord } from '@backend/domain/logging/application-log.types';
import FileApplicationLogger from '@infrastructure/logging/file-application.logger';
import { mkdtemp, readFile, readdir, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MAX_FILE_SIZE_BYTES: number = 10 * 1024 * 1024;

let tempDirectory: string | null = null;

describe('FileApplicationLogger', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-logger-'));
  });

  afterEach(async (): Promise<void> => {
    vi.restoreAllMocks();

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('persiste una entrada JSON Lines completa', async (): Promise<void> => {
    const logger: FileApplicationLogger = createLogger();

    logger.error({
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: new TypeError('La impresora no está disponible.'),
    });

    await logger.flush();

    const records: readonly ApplicationLogRecord[] = await readRecords();

    expect(records).toHaveLength(1);

    expect(records[0]).toMatchObject({
      schemaVersion: 1,
      level: 'error',
      source: 'main',
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      appVersion: '1.2.3-test',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: {
        name: 'TypeError',
        message: 'La impresora no está disponible.',
      },
    });

    expect(records[0]?.timestamp).toBe('2026-10-08T10:00:00.000Z');
  });

  it('permite identificar explícitamente una entrada del renderer', async (): Promise<void> => {
    const logger: FileApplicationLogger = createLogger();

    logger.warn({
      source: 'renderer',
      area: 'ventas',
      operation: 'post-commit',
      message: 'La venta se ha guardado con incidencias posteriores.',
    });

    await logger.flush();

    const records: readonly ApplicationLogRecord[] = await readRecords();

    expect(records[0]?.source).toBe('renderer');
    expect(records[0]?.level).toBe('warn');
  });

  it('conserva el orden de múltiples entradas encoladas', async (): Promise<void> => {
    const logger: FileApplicationLogger = createLogger();

    logger.info({
      area: 'application',
      operation: 'first',
      message: 'Primera entrada.',
    });

    logger.warn({
      area: 'application',
      operation: 'second',
      message: 'Segunda entrada.',
    });

    logger.error({
      area: 'application',
      operation: 'third',
      message: 'Tercera entrada.',
    });

    await logger.flush();

    const records: readonly ApplicationLogRecord[] = await readRecords();

    expect(records.map((record): string => record.operation)).toEqual(['first', 'second', 'third']);
  });

  it('redacta secretos evidentes en mensaje y contexto', async (): Promise<void> => {
    const logger: FileApplicationLogger = createLogger();

    logger.error({
      area: 'backup',
      operation: 'authenticate',
      message: 'Authorization: Bearer abc.def.ghi password=password-secreto',
      context: {
        token: 'token-secreto',
        backupSecret: 'backup-secret-secreto',
        publicId: 'public-id-seguro',
        detail: 'Bearer otro-token-secreto',
      },
    });

    await logger.flush();

    const content: string = await readCurrentLog();

    expect(content).not.toContain('abc.def.ghi');
    expect(content).not.toContain('password-secreto');
    expect(content).not.toContain('token-secreto');
    expect(content).not.toContain('backup-secret-secreto');
    expect(content).not.toContain('otro-token-secreto');

    expect(content).toContain('[REDACTED]');
    expect(content).toContain('public-id-seguro');
  });

  it('rota exactamente cinco ficheros al superar 10 MiB', async (): Promise<void> => {
    const directory: string = requireTempDirectory();

    const currentFile: string = join(directory, 'osumi-tpv.log');

    await writeFile(currentFile, 'x', {
      encoding: 'utf8',
    });

    await truncate(currentFile, MAX_FILE_SIZE_BYTES - 1);

    await Promise.all([
      writeFile(join(directory, 'osumi-tpv.1.log'), 'old-1', {
        encoding: 'utf8',
      }),
      writeFile(join(directory, 'osumi-tpv.2.log'), 'old-2', {
        encoding: 'utf8',
      }),
      writeFile(join(directory, 'osumi-tpv.3.log'), 'old-3', {
        encoding: 'utf8',
      }),
      writeFile(join(directory, 'osumi-tpv.4.log'), 'old-4', {
        encoding: 'utf8',
      }),
    ]);

    const logger: FileApplicationLogger = createLogger();

    logger.info({
      area: 'application',
      operation: 'rotation-test',
      message: 'Entrada posterior a la rotación.',
    });

    await logger.flush();

    const files: readonly string[] = (await readdir(directory))
      .filter((fileName: string): boolean => /^osumi-tpv(?:\.[1-4])?\.log$/.test(fileName))
      .sort();

    expect(files).toHaveLength(5);

    expect(await readFile(join(directory, 'osumi-tpv.2.log'), 'utf8')).toBe('old-1');

    expect(await readFile(join(directory, 'osumi-tpv.3.log'), 'utf8')).toBe('old-2');

    expect(await readFile(join(directory, 'osumi-tpv.4.log'), 'utf8')).toBe('old-3');

    expect(await readFile(join(directory, 'osumi-tpv.1.log'))).toHaveLength(
      MAX_FILE_SIZE_BYTES - 1,
    );

    const records: readonly ApplicationLogRecord[] = await readRecords();

    expect(records[0]?.operation).toBe('rotation-test');
  });

  it('no propaga un fallo del propio filesystem', async (): Promise<void> => {
    const directory: string = requireTempDirectory();

    const invalidLogsDirectory: string = join(directory, 'not-a-directory');

    await writeFile(invalidLogsDirectory, 'file', {
      encoding: 'utf8',
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    const logger: FileApplicationLogger = new FileApplicationLogger(
      invalidLogsDirectory,
      '1.2.3-test',
    );

    expect((): void => {
      logger.error({
        area: 'application',
        operation: 'filesystem-failure',
        message: 'Esta entrada no podrá escribirse.',
      });
    }).not.toThrow();

    await expect(logger.flush()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('limita el número de campos de contexto persistidos', async (): Promise<void> => {
    const logger: FileApplicationLogger = createLogger();

    const context: Record<string, number> = {};

    for (let index: number = 0; index < 50; index++) {
      context[`field${index}`] = index;
    }

    logger.info({
      area: 'application',
      operation: 'large-context',
      message: 'Contexto grande.',
      context,
    });

    await logger.flush();

    const records: readonly ApplicationLogRecord[] = await readRecords();

    expect(Object.keys(records[0]?.context ?? {})).toHaveLength(32);
  });
});

/**
 * Construye un logger con reloj determinista.
 */
function createLogger(): FileApplicationLogger {
  return new FileApplicationLogger(
    requireTempDirectory(),
    '1.2.3-test',
    undefined,
    undefined,
    (): Date => new Date('2026-10-08T10:00:00.000Z'),
  );
}

/**
 * Lee y parsea todas las líneas del fichero activo.
 */
async function readRecords(): Promise<readonly ApplicationLogRecord[]> {
  const content: string = await readCurrentLog();

  return content
    .trim()
    .split('\n')
    .filter((line: string): boolean => line !== '')
    .map((line: string): ApplicationLogRecord => JSON.parse(line) as ApplicationLogRecord);
}

/**
 * Lee el fichero de log actualmente activo.
 */
function readCurrentLog(): Promise<string> {
  return readFile(join(requireTempDirectory(), 'osumi-tpv.log'), {
    encoding: 'utf8',
  });
}

/**
 * Devuelve el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del logger no está inicializado.');
  }

  return tempDirectory;
}
