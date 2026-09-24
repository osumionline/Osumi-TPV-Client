import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';

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

  /**
   * Autentica y descifra una copia v3 previamente seleccionada.
   */
  unlockRestorePackage(command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult>;
}
