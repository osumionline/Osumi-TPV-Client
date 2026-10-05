export interface BackupRemoteCredentials {
  readonly keyId: string;
  readonly secret: string;
}

export type BackupRemoteSubscriptionStatus = 'active' | 'expired';

export interface BackupRemoteInstallation {
  readonly publicId: string;
  readonly name: string;
}

export interface BackupRemoteSubscription {
  readonly publicId: string;
  readonly name: string;
  readonly status: BackupRemoteSubscriptionStatus;
}

export interface BackupRemoteSession {
  readonly token: string;
  readonly expiresAt: number;
  readonly installation: BackupRemoteInstallation;
  readonly subscription: BackupRemoteSubscription;
  readonly canUpload: boolean;
}

export interface BackupRemoteBackup {
  readonly publicId: string;
  readonly backupId: string;
  readonly createdAtClient: string;
  readonly formatVersion: number;
  readonly applicationVersion: string;
  readonly databaseSchemaVersion: number;
  readonly originalFilename: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly createdAt: string;
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
