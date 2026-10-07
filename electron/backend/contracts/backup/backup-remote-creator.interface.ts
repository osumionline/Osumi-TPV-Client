import type { BackupRemoteUploadResult } from '@desktop-contracts/backup/backup-remote.interface';

/**
 * Crea y registra una nueva copia remota.
 */
export default interface BackupRemoteCreator {
  /**
   * Genera la copia y la sube a TPV Backup.
   */
  create(): Promise<BackupRemoteUploadResult>;
}
