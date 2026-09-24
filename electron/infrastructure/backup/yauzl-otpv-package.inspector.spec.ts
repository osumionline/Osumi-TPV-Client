import type {
  OtpvV3AuthenticatedMetadata,
  OtpvV3Manifest,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import serializeOtpvV3AuthenticatedMetadata from '@backend/domain/backup/otpv-v3-authenticated-metadata.serializer';
import {
  OTPV_V3_APPLICATION,
  OTPV_V3_CRYPTO_SUITE,
  OTPV_V3_ENCRYPTION_ALGORITHM,
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_PAYLOAD_FORMAT,
  OTPV_V3_SCRYPT_BLOCK_SIZE,
  OTPV_V3_SCRYPT_COST,
  OTPV_V3_SCRYPT_PARALLELIZATION,
} from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';
import YauzlOtpvPackageInspector from '@infrastructure/backup/yauzl-otpv-package.inspector';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZipFile } from 'yazl';

interface TestZipEntry {
  readonly path: string;
  readonly content: Buffer | string;
}

let tempDirectory: string | null = null;

describe('YauzlOtpvPackageInspector', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-inspector-'));
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

  it('clasifica formatVersion 2 para delegarlo al importador legacy', async (): Promise<void> => {
    const packagePath: string = getPath('legacy.otpv');

    await writePackage(packagePath, [
      {
        path: 'manifest.json',
        content: JSON.stringify({
          formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
        }),
      },
      {
        path: 'database.sql',
        content: 'legacy',
      },
    ]);

    const inspector: YauzlOtpvPackageInspector = new YauzlOtpvPackageInspector();

    const result: OtpvPackageInspection = await inspector.inspect(packagePath);

    expect(result).toEqual({
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      manifest: null,
    });
  });

  it('valida y devuelve el manifest de un paquete v3 correcto', async (): Promise<void> => {
    const packagePath: string = getPath('native.otpv');
    const manifest: OtpvV3Manifest = createValidManifest();

    await writePackage(packagePath, [
      {
        path: 'manifest.json',
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
      {
        path: OTPV_V3_PAYLOAD_ENTRY,
        content: Buffer.from('encrypted-payload', 'utf8'),
      },
    ]);

    const inspector: YauzlOtpvPackageInspector = new YauzlOtpvPackageInspector();

    const result: OtpvPackageInspection = await inspector.inspect(packagePath);

    expect(result.formatVersion).toBe(OTPV_V3_FORMAT_VERSION);

    if (result.formatVersion !== OTPV_V3_FORMAT_VERSION) {
      throw new Error('Se esperaba un paquete v3.');
    }

    expect(result.manifest).toEqual(manifest);
  });

  it('rechaza entradas adicionales en el contenedor exterior v3', async (): Promise<void> => {
    const packagePath: string = getPath('invalid-outer.otpv');
    const manifest: OtpvV3Manifest = createValidManifest();

    await writePackage(packagePath, [
      {
        path: 'manifest.json',
        content: JSON.stringify(manifest),
      },
      {
        path: OTPV_V3_PAYLOAD_ENTRY,
        content: 'encrypted-payload',
      },
      {
        path: 'extra.txt',
        content: 'unexpected',
      },
    ]);

    const inspector: YauzlOtpvPackageInspector = new YauzlOtpvPackageInspector();

    await expect(inspector.inspect(packagePath)).rejects.toThrow(
      'exactamente manifest.json y payload.enc',
    );
  });

  it('rechaza una versión .otpv desconocida', async (): Promise<void> => {
    const packagePath: string = getPath('unknown.otpv');

    await writePackage(packagePath, [
      {
        path: 'manifest.json',
        content: JSON.stringify({
          formatVersion: 99,
        }),
      },
    ]);

    const inspector: YauzlOtpvPackageInspector = new YauzlOtpvPackageInspector();

    await expect(inspector.inspect(packagePath)).rejects.toThrow(
      'Versión de formato .otpv no soportada: 99.',
    );
  });

  it('rechaza un v3 de un esquema SQLite incompatible', async (): Promise<void> => {
    const packagePath: string = getPath('future-schema.otpv');

    const manifest: OtpvV3Manifest = createValidManifest(DATABASE_SCHEMA_VERSION + 1);

    await writePackage(packagePath, [
      {
        path: 'manifest.json',
        content: JSON.stringify(manifest),
      },
      {
        path: OTPV_V3_PAYLOAD_ENTRY,
        content: 'encrypted-payload',
      },
    ]);

    const inspector: YauzlOtpvPackageInspector = new YauzlOtpvPackageInspector();

    await expect(inspector.inspect(packagePath)).rejects.toThrow(
      `esta versión del Client admite la ${DATABASE_SCHEMA_VERSION}`,
    );
  });
});

/**
 * Construye un manifest v3 completo y criptográficamente
 * coherente hasta el nivel que corresponde a esta inspección.
 */
function createValidManifest(
  databaseSchemaVersion: number = DATABASE_SCHEMA_VERSION,
): OtpvV3Manifest {
  const metadata: OtpvV3AuthenticatedMetadata = {
    formatVersion: OTPV_V3_FORMAT_VERSION,
    backupId: '11111111-1111-4111-8111-111111111111',
    application: OTPV_V3_APPLICATION,
    applicationVersion: '1.2.3',
    databaseSchemaVersion,
    createdAt: '2026-09-24T10:00:00.000Z',
    cryptoSuite: OTPV_V3_CRYPTO_SUITE,
  };

  const authenticatedData: Buffer = serializeOtpvV3AuthenticatedMetadata(metadata);

  return {
    ...metadata,
    authenticatedData: authenticatedData.toString('base64'),
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
 * Genera un ZIP `.otpv` de prueba
 * con las entradas indicadas.
 */
async function writePackage(packagePath: string, entries: readonly TestZipEntry[]): Promise<void> {
  const zipFile: ZipFile = new ZipFile();

  for (const entry of entries) {
    const content: Buffer = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, 'utf8');

    zipFile.addBuffer(content, entry.path);
  }

  const writePromise: Promise<void> = pipeline(
    zipFile.outputStream,
    createWriteStream(packagePath),
  );

  zipFile.end();

  await writePromise;
}

/**
 * Construye una ruta dentro del directorio
 * temporal inicializado por el fixture.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return join(tempDirectory, fileName);
}
