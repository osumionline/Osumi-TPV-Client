import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';

export default interface OtpvV3RequiredContentExtractor {
  /**
   * Extrae exclusivamente los recursos obligatorios
   * del ZIP interior hacia el workspace temporal.
   */
  extract(payloadFile: string, destinations: OtpvV3RequiredContentPaths): Promise<void>;
}
