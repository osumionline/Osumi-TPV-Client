import type OtpvV3PreparedRestore from '@backend/domain/backup/otpv-v3-prepared-restore.interface';

export default interface OtpvV3PreparedRestoreStore {
  /**
   * Conserva la restauración cuyo staging
   * canónico está preparado para promoción.
   */
  save(preparedRestore: OtpvV3PreparedRestore): void;

  /**
   * Recupera la restauración preparada actual.
   */
  resolve(): OtpvV3PreparedRestore | null;

  /**
   * Invalida cualquier restauración preparada.
   */
  clear(): void;
}
