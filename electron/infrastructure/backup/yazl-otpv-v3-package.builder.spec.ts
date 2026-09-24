import { validateOtpvV3Manifest } from '@backend/application/backup/otpv-v3-contract.validator';
import type { OtpvV3EncryptionResult } from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type {
  OtpvV3BuildPayloadCommand,
  OtpvV3PayloadBuilder,
} from '@backend/contracts/backup/otpv-v3-payload-builder.interface';
import {
  OTPV_V3_APPLICATION,
  OTPV_V3_CRYPTO_SUITE,
  OTPV_V3_ENCRYPTION_ALGORITHM,
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_MANIFEST_ENTRY,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_PAYLOAD_FORMAT,
  OTPV_V3_SCRYPT_BLOCK_SIZE,
  OTPV_V3_SCRYPT_COST,
  OTPV_V3_SCRYPT_PARALLELIZATION,
} from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import YazlOtpvV3PackageBuilder from '@infrastructure/backup/yazl-otpv-v3-package.builder';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Entry, ZipFile } from 'yauzl';
import { open } from 'yauzl';

const BACKUP_API_KEY: string = 'backup-key-package-test';
const PAYLOAD_CONTENT: Buffer = Buffer.from('encrypted-payload-fixture', 'utf8');

let tempDirectory: string | null = null;

describe('YazlOtpvV3PackageBuilder', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-package-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, { recursive: true, force: true });
    }

    tempDirectory = null;
  });

  it('genera un .otpv v3 con exactamente manifest.json y payload.enc', async (): Promise<void> => {
    const payloadBuilder: TestPayloadBuilder = new TestPayloadBuilder();
    const builder: YazlOtpvV3PackageBuilder = new YazlOtpvV3PackageBuilder('1.2.3', payloadBuilder);

    const destinationFile: string = getPath('backup.otpv');

    const result = await builder.create({
      backupApiKey: BACKUP_API_KEY,
      destinationFile,
    });

    expect(result.destinationFile).toBe(destinationFile);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const entries: ReadonlyMap<string, TestZipEntry> = await readZipEntries(destinationFile);

    expect([...entries.keys()].sort()).toEqual([OTPV_V3_MANIFEST_ENTRY, OTPV_V3_PAYLOAD_ENTRY]);

    expect(requireEntry(entries, OTPV_V3_PAYLOAD_ENTRY).content).toEqual(PAYLOAD_CONTENT);
    expect(requireEntry(entries, OTPV_V3_PAYLOAD_ENTRY).compressionMethod).toBe(0);

    const manifestValue: unknown = JSON.parse(
      requireEntry(entries, OTPV_V3_MANIFEST_ENTRY).content.toString('utf8'),
    );

    const manifest: OtpvV3Manifest = validateOtpvV3Manifest(manifestValue);

    expect(manifest.formatVersion).toBe(OTPV_V3_FORMAT_VERSION);
    expect(manifest.application).toBe(OTPV_V3_APPLICATION);
    expect(manifest.applicationVersion).toBe('1.2.3');
    expect(manifest.databaseSchemaVersion).toBe(DATABASE_SCHEMA_VERSION);
    expect(manifest.cryptoSuite).toBe(OTPV_V3_CRYPTO_SUITE);

    expect(payloadBuilder.authenticatedData).not.toBeNull();
    expect(payloadBuilder.authenticatedData?.toString('base64')).toBe(manifest.authenticatedData);
    expect(payloadBuilder.destinationFile).not.toBeNull();

    const payloadTemporaryName: string = basename(payloadBuilder.destinationFile ?? '');

    expect(payloadTemporaryName).toMatch(
      /^\.payload-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.enc$/i,
    );

    expect(payloadTemporaryName).not.toContain('backup.otpv');

    expect(await readdir(requireTempDirectory())).toEqual(['backup.otpv']);
  });

  it('no sobrescribe un .otpv ya existente', async (): Promise<void> => {
    const destinationFile: string = getPath('existing.otpv');

    await writeFile(destinationFile, 'existente', { encoding: 'utf8' });

    const builder: YazlOtpvV3PackageBuilder = new YazlOtpvV3PackageBuilder(
      '1.2.3',
      new TestPayloadBuilder(),
    );

    await expect(
      builder.create({
        backupApiKey: BACKUP_API_KEY,
        destinationFile,
      }),
    ).rejects.toThrow('destino ya existe');

    expect(await readFile(destinationFile, { encoding: 'utf8' })).toBe('existente');
  });

  it('elimina los temporales cuando falla la creación del payload', async (): Promise<void> => {
    const builder: YazlOtpvV3PackageBuilder = new YazlOtpvV3PackageBuilder(
      '1.2.3',
      new FailingPayloadBuilder(),
    );

    const destinationFile: string = getPath('failed.otpv');

    await expect(
      builder.create({
        backupApiKey: BACKUP_API_KEY,
        destinationFile,
      }),
    ).rejects.toThrow('No se ha podido generar la copia de seguridad .otpv.');

    expect(await readdir(requireTempDirectory())).toEqual([]);
  });
});

interface TestZipEntry {
  readonly content: Buffer;
  readonly compressionMethod: number;
}

/**
 * Payload builder determinista para aislar
 * las pruebas del contenedor exterior.
 */
class TestPayloadBuilder implements OtpvV3PayloadBuilder {
  authenticatedData: Buffer | null = null;
  destinationFile: string | null = null;

  /**
   * Genera un payload cifrado de prueba
   * y devuelve metadatos criptográficos válidos.
   */
  async create(command: OtpvV3BuildPayloadCommand): Promise<OtpvV3EncryptionResult> {
    this.authenticatedData = Buffer.from(command.authenticatedData);
    this.destinationFile = command.destinationFile;

    await writeFile(command.destinationFile, PAYLOAD_CONTENT);

    return createEncryptionResult();
  }
}

/**
 * Payload builder que simula un fallo
 * después de crear parcialmente payload.enc.
 */
class FailingPayloadBuilder implements OtpvV3PayloadBuilder {
  /**
   * Escribe un temporal parcial y falla
   * para verificar la limpieza del package builder.
   */
  async create(command: OtpvV3BuildPayloadCommand): Promise<OtpvV3EncryptionResult> {
    await writeFile(command.destinationFile, 'partial-payload');

    throw new Error('Fallo simulado creando payload.');
  }
}

/**
 * Construye metadatos criptográficos
 * válidos para los tests del ZIP exterior.
 */
function createEncryptionResult(): OtpvV3EncryptionResult {
  return {
    kdf: {
      algorithm: OTPV_V3_KDF_ALGORITHM,
      salt: Buffer.alloc(32, 1).toString('base64'),
      cost: OTPV_V3_SCRYPT_COST,
      blockSize: OTPV_V3_SCRYPT_BLOCK_SIZE,
      parallelization: OTPV_V3_SCRYPT_PARALLELIZATION,
      length: OTPV_V3_KDF_LENGTH_BYTES,
    },
    keyWrap: {
      algorithm: OTPV_V3_ENCRYPTION_ALGORITHM,
      iv: Buffer.alloc(12, 2).toString('base64'),
      authTag: Buffer.alloc(16, 3).toString('base64'),
      wrappedDek: Buffer.alloc(32, 4).toString('base64'),
    },
    payload: {
      entry: OTPV_V3_PAYLOAD_ENTRY,
      format: OTPV_V3_PAYLOAD_FORMAT,
      algorithm: OTPV_V3_ENCRYPTION_ALGORITHM,
      iv: Buffer.alloc(12, 5).toString('base64'),
      authTag: Buffer.alloc(16, 6).toString('base64'),
    },
  };
}

/**
 * Lee las dos entradas del ZIP exterior
 * utilizado en los tests.
 */
function readZipEntries(zipPath: string): Promise<ReadonlyMap<string, TestZipEntry>> {
  return new Promise<ReadonlyMap<string, TestZipEntry>>((resolve, reject): void => {
    open(
      zipPath,
      {
        lazyEntries: true,
        autoClose: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true,
      },
      (error: Error | null, zipFile?: ZipFile): void => {
        if (error !== null) {
          reject(error);
          return;
        }

        if (zipFile === undefined) {
          reject(new Error('No se ha podido abrir el .otpv de prueba.'));
          return;
        }

        const result: Map<string, TestZipEntry> = new Map<string, TestZipEntry>();

        zipFile.once('error', (zipError: Error): void => reject(zipError));
        zipFile.once('end', (): void => resolve(result));

        zipFile.on('entry', (entry: Entry): void => {
          zipFile.openReadStream(entry, (streamError: Error | null, stream?: Readable): void => {
            if (streamError !== null) {
              reject(streamError);
              return;
            }

            if (stream === undefined) {
              reject(new Error(`No se ha podido leer ${entry.fileName}.`));
              return;
            }

            const chunks: Buffer[] = [];

            stream.on('data', (chunk: Buffer | string): void => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            stream.once('error', (entryError: Error): void => reject(entryError));

            stream.once('end', (): void => {
              result.set(entry.fileName, {
                content: Buffer.concat(chunks),
                compressionMethod: entry.compressionMethod,
              });

              zipFile.readEntry();
            });
          });
        });

        zipFile.readEntry();
      },
    );
  });
}

/**
 * Recupera una entrada obligatoria
 * del .otpv utilizado en tests.
 */
function requireEntry(entries: ReadonlyMap<string, TestZipEntry>, entryName: string): TestZipEntry {
  const entry: TestZipEntry | undefined = entries.get(entryName);

  if (entry === undefined) {
    throw new Error(`No se ha encontrado ${entryName}.`);
  }

  return entry;
}

/**
 * Construye una ruta dentro del directorio
 * temporal del test.
 */
function getPath(fileName: string): string {
  return join(requireTempDirectory(), fileName);
}

/**
 * Devuelve el directorio temporal
 * inicializado para el fixture.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}
