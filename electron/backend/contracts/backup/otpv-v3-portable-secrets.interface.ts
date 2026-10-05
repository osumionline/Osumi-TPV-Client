import type { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';

export default interface OtpvV3PortableSecrets {
  readonly schemaVersion: 1;
  readonly secretApi: string;
  readonly emailSmtpPass: string | null;
  readonly ticketBaiToken: string | null;
  readonly backupRemoteCredentials: BackupRemoteCredentials | null;
}
