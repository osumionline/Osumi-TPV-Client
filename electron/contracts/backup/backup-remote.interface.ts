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

export interface BackupRemoteConnection {
  readonly expiresAt: number;
  readonly installation: BackupRemoteInstallation;
  readonly subscription: BackupRemoteSubscription;
  readonly canUpload: boolean;
}

export interface BackupRemoteUploadResult {
  readonly publicId: string;
  readonly backupId: string;
  readonly createdAtClient: string;
  readonly originalFilename: string;
  readonly sizeBytes: number;
  readonly sha256: string;
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
