import { Service } from '@angular/core';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';

@Service()
export default class DesktopBackupService {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult> {
    return window.osumiDesktop.backup.createLocal();
  }
}
