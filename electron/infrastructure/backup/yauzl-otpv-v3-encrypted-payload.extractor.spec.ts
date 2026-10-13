import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import YauzlOtpvV3EncryptedPayloadExtractor from '@infrastructure/backup/yauzl-otpv-v3-encrypted-payload.extractor';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZipFile } from 'yazl';

let tempDirectory: string | null = null;

describe('YauzlOtpvV3EncryptedPayloadExtractor', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-payload-extractor-'));
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

  it('extrae exactamente payload.enc', async (): Promise<void> => {
    const packagePath: string = getPath('backup.otpv');
    const destinationFile: string = getPath('payload.enc');
    const payload: Buffer = Buffer.from('payload-cifrado-de-prueba', 'utf8');

    await createPackage(packagePath, payload, false);

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor(createLogger());

    await extractor.extract(packagePath, destinationFile);

    expect(await readFile(destinationFile)).toEqual(payload);
  });

  it('rechaza payload.enc recomprimido', async (): Promise<void> => {
    const packagePath: string = getPath('compressed.otpv');

    await createPackage(packagePath, Buffer.alloc(10_000, 1), true);

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor(createLogger());

    await expect(extractor.extract(packagePath, getPath('payload.enc'))).rejects.toThrow(
      'payload.enc debe almacenarse sin compresión',
    );
  });

  it('no sobrescribe un destino existente', async (): Promise<void> => {
    const packagePath: string = getPath('backup.otpv');
    const destinationFile: string = getPath('existing.enc');

    await createPackage(packagePath, Buffer.from('payload', 'utf8'), false);

    await writeFile(destinationFile, 'existente', {
      encoding: 'utf8',
    });

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor(createLogger());

    await expect(extractor.extract(packagePath, destinationFile)).rejects.toThrow(
      'destino de payload.enc ya existe',
    );

    expect(
      await readFile(destinationFile, {
        encoding: 'utf8',
      }),
    ).toBe('existente');
  });

  it('propaga errores distintos de ENOENT al comprobar el destino', async (): Promise<void> => {
    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor(createLogger());

    await expect(extractor.extract('unused.otpv', 'invalid\0payload.enc')).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('registra un fallo de cleanup sin propagarlo ni exponer la ruta temporal', async (): Promise<void> => {
    const cleanupError: Error = new Error('No se ha podido eliminar el temporal.');
    const logger: ApplicationLogger = createLogger();

    const removeFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      void filePath;
      void options;

      throw cleanupError;
    };

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor(logger, removeFile);

    const temporaryFile: string = getPath('.extract-test.tmp');

    await expect(extractor['removeTemporaryFileSafely'](temporaryFile)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(1);

    expect(logger.warn).toHaveBeenCalledWith({
      area: 'backup',
      operation: 'restore-encrypted-payload-temp-cleanup',
      message: 'No se ha podido limpiar un payload cifrado temporal de restauración.',
      error: cleanupError,
    });

    const event: ApplicationLogEvent = vi.mocked(logger.warn).mock.calls[0][0];

    expect(event.context).toBeUndefined();
  });
});

/**
 * Construye un `.otpv` exterior mínimo.
 */
async function createPackage(
  packagePath: string,
  payload: Buffer,
  compressPayload: boolean,
): Promise<void> {
  const zipFile: ZipFile = new ZipFile();

  zipFile.addBuffer(Buffer.from('{"formatVersion":3}', 'utf8'), 'manifest.json');

  zipFile.addBuffer(payload, 'payload.enc', {
    compress: compressPayload,
  });

  const writePromise: Promise<void> = pipeline(
    zipFile.outputStream,
    createWriteStream(packagePath),
  );

  zipFile.end();

  await writePromise;
}

/**
 * Construye una ruta dentro del fixture temporal.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return join(tempDirectory, fileName);
}

/**
 * Crea un logger de pruebas con todos
 * los niveles y operaciones simulados.
 */
function createLogger(): ApplicationLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };
}
