import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';

export default interface OtpvV3RequiredContentValidator {
  /**
   * Valida semánticamente los recursos obligatorios
   * ya extraídos del payload.
   */
  validate(paths: OtpvV3RequiredContentPaths): Promise<void>;
}
