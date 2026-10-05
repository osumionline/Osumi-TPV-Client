import type {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteInstallation,
  BackupRemoteSubscription,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';

export interface BackupRemoteSession {
  readonly token: string;
  readonly expiresAt: number;
  readonly installation: BackupRemoteInstallation;
  readonly subscription: BackupRemoteSubscription;
  readonly canUpload: boolean;
}

export interface BackupRemoteDownloadTransferResult {
  readonly sizeBytes: number;
  readonly sha256: string;
}

export interface BackupRemoteClient {
  /**
   * Autentica una instalación mediante su credencial
   * específica de TPV Backup.
   */
  authenticate(credentials: BackupRemoteCredentials): Promise<BackupRemoteSession>;

  /**
   * Obtiene las copias remotas pertenecientes
   * a la instalación autenticada.
   */
  list(token: string): Promise<readonly BackupRemoteBackup[]>;

  /**
   * Sube una copia local al almacenamiento remoto.
   *
   * El fichero debe transmitirse sin cargar
   * todo su contenido en memoria.
   */
  upload(token: string, filePath: string, fileName: string): Promise<BackupRemoteUploadResult>;

  /**
   * Descarga una copia remota directamente a disco
   * sin materializar todo su contenido en memoria.
   */
  download(
    token: string,
    publicId: string,
    destinationFile: string,
  ): Promise<BackupRemoteDownloadTransferResult>;
}
