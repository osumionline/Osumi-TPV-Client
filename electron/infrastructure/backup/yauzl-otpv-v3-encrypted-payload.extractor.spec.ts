import YauzlOtpvV3EncryptedPayloadExtractor from '@infrastructure/backup/yauzl-otpv-v3-encrypted-payload.extractor';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor();

    await extractor.extract(packagePath, destinationFile);

    expect(await readFile(destinationFile)).toEqual(payload);
  });

  it('rechaza payload.enc recomprimido', async (): Promise<void> => {
    const packagePath: string = getPath('compressed.otpv');

    await createPackage(packagePath, Buffer.alloc(10_000, 1), true);

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor();

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

    const extractor = new YauzlOtpvV3EncryptedPayloadExtractor();

    await expect(extractor.extract(packagePath, destinationFile)).rejects.toThrow(
      'destino de payload.enc ya existe',
    );

    expect(
      await readFile(destinationFile, {
        encoding: 'utf8',
      }),
    ).toBe('existente');
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
