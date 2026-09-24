import {
  assertOtpvV3ManifestCompatible,
  validateOtpvV3Manifest,
  validateOtpvV3PortableSecrets,
} from '@backend/application/backup/otpv-v3-contract.validator';
import type {
  OtpvV3AuthenticatedMetadata,
  OtpvV3Manifest,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';
import serializeOtpvV3AuthenticatedMetadata from '@backend/domain/backup/otpv-v3-authenticated-metadata.serializer';
import {
  OTPV_V3_APPLICATION,
  OTPV_V3_CRYPTO_SUITE,
  OTPV_V3_ENCRYPTION_ALGORITHM,
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_INFO,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_PAYLOAD_FORMAT,
} from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import { describe, expect, it } from 'vitest';

describe('OTPV v3 contract validator', (): void => {
  it('acepta un manifest v3 válido y compatible', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect(validateOtpvV3Manifest(manifest)).toEqual(manifest);
    expect((): void => assertOtpvV3ManifestCompatible(manifest)).not.toThrow();
  });

  it('rechaza propiedades no declaradas en el manifest', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        unexpected: true,
      });
    }).toThrow('manifest.json no tiene la estructura exacta esperada.');
  });

  it('rechaza un UUID que no sea v4', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        backupId: '11111111-1111-3111-8111-111111111111',
      });
    }).toThrow('UUID v4');
  });

  it('rechaza una fecha que no use el formato UTC canónico', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        createdAt: '2026-09-24T08:00:00+00:00',
      });
    }).toThrow('fecha UTC válida');
  });

  it('rechaza material criptográfico con longitud incorrecta', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        kdf: {
          ...manifest.kdf,
          salt: Buffer.alloc(31, 1).toString('base64'),
        },
      });
    }).toThrow('longitud binaria esperada');
  });

  it('rechaza authenticatedData que no coincide con el manifest', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        applicationVersion: '9.9.9',
      });
    }).toThrow('authenticatedData no coincide');
  });

  it('rechaza authenticatedData no serializado canónicamente', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    const metadata: OtpvV3AuthenticatedMetadata = {
      formatVersion: manifest.formatVersion,
      backupId: manifest.backupId,
      application: manifest.application,
      applicationVersion: manifest.applicationVersion,
      databaseSchemaVersion: manifest.databaseSchemaVersion,
      createdAt: manifest.createdAt,
      cryptoSuite: manifest.cryptoSuite,
    };

    const nonCanonical: string = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8').toString(
      'base64',
    );

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        authenticatedData: nonCanonical,
      });
    }).toThrow('serialización canónica');
  });

  it('rechaza reutilizar el mismo IV para keyWrap y payload', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    expect((): void => {
      validateOtpvV3Manifest({
        ...manifest,
        payload: {
          ...manifest.payload,
          iv: manifest.keyWrap.iv,
        },
      });
    }).toThrow('deben ser distintos');
  });

  it('separa validación estructural de compatibilidad de esquema', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest(DATABASE_SCHEMA_VERSION + 1);

    expect(validateOtpvV3Manifest(manifest)).toEqual(manifest);
    expect((): void => assertOtpvV3ManifestCompatible(manifest)).toThrow('versión de esquema');
  });

  it('valida los secretos portables y exige TPV Backup key', (): void => {
    expect(
      validateOtpvV3PortableSecrets({
        schemaVersion: 1,
        secretApi: '',
        backupApiKey: 'backup-secret',
        emailSmtpPass: null,
        ticketBaiToken: null,
      }),
    ).toEqual({
      schemaVersion: 1,
      secretApi: '',
      backupApiKey: 'backup-secret',
      emailSmtpPass: null,
      ticketBaiToken: null,
    });

    expect((): void => {
      validateOtpvV3PortableSecrets({
        schemaVersion: 1,
        secretApi: '',
        backupApiKey: '',
        emailSmtpPass: null,
        ticketBaiToken: null,
      });
    }).toThrow('TPV Backup key no puede estar vacía');
  });

  it('serializa los metadatos en el orden canónico establecido', (): void => {
    const manifest: OtpvV3Manifest = createValidManifest();

    const metadata: OtpvV3AuthenticatedMetadata = {
      formatVersion: manifest.formatVersion,
      backupId: manifest.backupId,
      application: manifest.application,
      applicationVersion: manifest.applicationVersion,
      databaseSchemaVersion: manifest.databaseSchemaVersion,
      createdAt: manifest.createdAt,
      cryptoSuite: manifest.cryptoSuite,
    };

    expect(serializeOtpvV3AuthenticatedMetadata(metadata).toString('utf8')).toBe(
      [
        '{"formatVersion":3,',
        '"backupId":"123e4567-e89b-42d3-a456-426614174000",',
        '"application":"Osumi TPV Client",',
        '"applicationVersion":"0.0.0",',
        `"databaseSchemaVersion":${DATABASE_SCHEMA_VERSION},`,
        '"createdAt":"2026-09-24T06:00:00.000Z",',
        '"cryptoSuite":"otpv3-hkdf-sha256-aes-256-gcm"}',
      ].join(''),
    );
  });
});

/**
 * Construye un manifest v3 completo
 * para los tests del contrato.
 */
function createValidManifest(
  databaseSchemaVersion: number = DATABASE_SCHEMA_VERSION,
): OtpvV3Manifest {
  const metadata: OtpvV3AuthenticatedMetadata = {
    formatVersion: OTPV_V3_FORMAT_VERSION,
    backupId: '123e4567-e89b-42d3-a456-426614174000',
    application: OTPV_V3_APPLICATION,
    applicationVersion: '0.0.0',
    databaseSchemaVersion,
    createdAt: '2026-09-24T06:00:00.000Z',
    cryptoSuite: OTPV_V3_CRYPTO_SUITE,
  };

  return {
    ...metadata,
    authenticatedData: serializeOtpvV3AuthenticatedMetadata(metadata).toString('base64'),
    kdf: {
      algorithm: OTPV_V3_KDF_ALGORITHM,
      salt: Buffer.alloc(32, 1).toString('base64'),
      info: OTPV_V3_KDF_INFO,
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
