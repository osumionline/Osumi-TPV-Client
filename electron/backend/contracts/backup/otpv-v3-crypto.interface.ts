import type {
  OtpvV3Kdf,
  OtpvV3KeyWrap,
  OtpvV3PayloadEncryption,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';

export interface OtpvV3EncryptFileCommand {
  readonly backupApiKey: string;
  readonly authenticatedData: Buffer;
  readonly sourceFile: string;
  readonly destinationFile: string;
}

export interface OtpvV3EncryptionResult {
  readonly kdf: OtpvV3Kdf;
  readonly keyWrap: OtpvV3KeyWrap;
  readonly payload: OtpvV3PayloadEncryption;
}

export interface OtpvV3DecryptFileCommand {
  readonly backupApiKey: string;
  readonly authenticatedData: Buffer;
  readonly kdf: OtpvV3Kdf;
  readonly keyWrap: OtpvV3KeyWrap;
  readonly payload: OtpvV3PayloadEncryption;
  readonly sourceFile: string;
  readonly destinationFile: string;
}

export interface OtpvV3Crypto {
  /**
   * Cifra mediante `.otpv` v3 un fichero
   * que contiene el ZIP interior del backup.
   */
  encryptFile(command: OtpvV3EncryptFileCommand): Promise<OtpvV3EncryptionResult>;

  /**
   * Descifra y autentica un payload `.otpv` v3
   * escribiendo el ZIP interior recuperado.
   */
  decryptFile(command: OtpvV3DecryptFileCommand): Promise<void>;
}
