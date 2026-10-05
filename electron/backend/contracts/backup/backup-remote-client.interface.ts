import type {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteInstallation,
  BackupRemoteSubscription,
} from '@desktop-contracts/backup/backup-remote.interface';

export interface BackupRemoteSession {
  readonly token: string;
  readonly expiresAt: number;
  readonly installation: BackupRemoteInstallation;
  readonly subscription: BackupRemoteSubscription;
  readonly canUpload: boolean;
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
}
