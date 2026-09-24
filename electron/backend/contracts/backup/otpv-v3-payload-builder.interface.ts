import type { OtpvV3EncryptionResult } from '@backend/contracts/backup/otpv-v3-crypto.interface';

export interface OtpvV3BuildPayloadCommand {
  readonly backupApiKey: string;
  readonly authenticatedData: Buffer;
  readonly destinationFile: string;
}

export interface OtpvV3PayloadBuilder {
  /**
   * Construye el ZIP interior de una instalación,
   * lo cifra mediante streaming y genera payload.enc.
   */
  create(command: OtpvV3BuildPayloadCommand): Promise<OtpvV3EncryptionResult>;
}
