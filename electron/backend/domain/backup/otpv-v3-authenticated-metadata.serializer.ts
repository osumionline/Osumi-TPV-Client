import type { OtpvV3AuthenticatedMetadata } from '@backend/contracts/backup/otpv-v3-manifest.interface';

/**
 * Serializa los metadatos autenticados de `.otpv` v3
 * utilizando el orden canónico definido por el formato.
 */
export default function serializeOtpvV3AuthenticatedMetadata(
  metadata: OtpvV3AuthenticatedMetadata,
): Buffer {
  const serialized: string = JSON.stringify({
    formatVersion: metadata.formatVersion,
    backupId: metadata.backupId,
    application: metadata.application,
    applicationVersion: metadata.applicationVersion,
    databaseSchemaVersion: metadata.databaseSchemaVersion,
    createdAt: metadata.createdAt,
    cryptoSuite: metadata.cryptoSuite,
  });

  return Buffer.from(serialized, 'utf8');
}
