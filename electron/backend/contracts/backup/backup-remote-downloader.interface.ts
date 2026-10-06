import type { BackupRemoteDownloadResult } from '@desktop-contracts/backup/backup-remote.interface';

/**
 * Descarga una copia remota a un almacenamiento
 * controlado por la capa de aplicación.
 */
export default interface BackupRemoteDownloader {
  download(value: unknown): Promise<BackupRemoteDownloadResult>;
}
