import type { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';

export default interface OtpvV3PreparedRestore {
  readonly selectionId: string;
  readonly backupId: string;
  readonly backupRemoteCredentials: BackupRemoteCredentials | null;
}
