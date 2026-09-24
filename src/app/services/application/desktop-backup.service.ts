import { Service } from '@angular/core';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';

@Service()
export default class DesktopBackupService {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult> {
    return window.osumiDesktop.backup.createLocal();
  }

  /**
   * Selecciona un `.otpv` para recuperación.
   */
  selectRestorePackage(): Promise<BackupRestorePackageSelectionResult> {
    return window.osumiDesktop.backup.selectRestorePackage();
  }
}
