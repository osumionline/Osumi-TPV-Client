export interface OtpvV3AuthenticatedMetadata {
  readonly formatVersion: 3;
  readonly backupId: string;
  readonly application: 'Osumi TPV Client';
  readonly applicationVersion: string;
  readonly databaseSchemaVersion: number;
  readonly createdAt: string;
  readonly cryptoSuite: 'otpv3-scrypt-aes-256-gcm';
}

export interface OtpvV3Kdf {
  readonly algorithm: 'scrypt';

  /**
   * Salt aleatorio de 32 bytes codificado en Base64.
   */
  readonly salt: string;

  readonly cost: 32768;
  readonly blockSize: 8;
  readonly parallelization: 3;
  readonly length: 32;
}

export interface OtpvV3KeyWrap {
  readonly algorithm: 'aes-256-gcm';

  /**
   * IV aleatorio de 12 bytes
   * codificado en Base64.
   */
  readonly iv: string;

  /**
   * Authentication tag de 16 bytes
   * codificado en Base64.
   */
  readonly authTag: string;

  /**
   * DEK cifrada mediante la KEK.
   *
   * El plaintext original tiene 32 bytes.
   */
  readonly wrappedDek: string;
}

export interface OtpvV3PayloadEncryption {
  readonly entry: 'payload.enc';
  readonly format: 'zip';
  readonly algorithm: 'aes-256-gcm';

  /**
   * IV aleatorio de 12 bytes
   * codificado en Base64.
   */
  readonly iv: string;

  /**
   * Authentication tag de 16 bytes
   * codificado en Base64.
   */
  readonly authTag: string;
}

export interface OtpvV3Manifest {
  readonly formatVersion: 3;
  readonly application: 'Osumi TPV Client';
  readonly applicationVersion: string;
  readonly databaseSchemaVersion: number;

  /**
   * UUID v4 único de la copia.
   */
  readonly backupId: string;

  /**
   * Fecha ISO 8601 UTC.
   */
  readonly createdAt: string;
  readonly cryptoSuite: 'otpv3-scrypt-aes-256-gcm';

  /**
   * Bytes UTF-8 exactos del JSON compacto
   * de OtpvV3AuthenticatedMetadata,
   * codificados en Base64.
   */
  readonly authenticatedData: string;
  readonly kdf: OtpvV3Kdf;
  readonly keyWrap: OtpvV3KeyWrap;
  readonly payload: OtpvV3PayloadEncryption;
}
