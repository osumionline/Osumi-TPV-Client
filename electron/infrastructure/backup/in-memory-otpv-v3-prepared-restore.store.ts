import type OtpvV3PreparedRestoreStore from '@backend/contracts/backup/otpv-v3-prepared-restore-store.interface';
import type OtpvV3PreparedRestore from '@backend/domain/backup/otpv-v3-prepared-restore.interface';

export default class InMemoryOtpvV3PreparedRestoreStore implements OtpvV3PreparedRestoreStore {
  private preparedRestore: OtpvV3PreparedRestore | null = null;

  /**
   * Conserva una única restauración preparada.
   */
  save(preparedRestore: OtpvV3PreparedRestore): void {
    this.preparedRestore = preparedRestore;
  }

  /**
   * Recupera la restauración preparada.
   */
  resolve(): OtpvV3PreparedRestore | null {
    return this.preparedRestore;
  }

  /**
   * Invalida el staging preparado actual.
   */
  clear(): void {
    this.preparedRestore = null;
  }
}
