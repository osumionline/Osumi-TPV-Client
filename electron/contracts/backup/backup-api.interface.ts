import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';

export default interface BackupApi {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult>;
}
