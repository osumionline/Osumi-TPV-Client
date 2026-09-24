import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';

export default interface BackupApi {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult>;

  /**
   * Selecciona una copia o exportación `.otpv`
   * y determina el flujo necesario para recuperarla.
   */
  selectRestorePackage(): Promise<BackupRestorePackageSelectionResult>;
}
