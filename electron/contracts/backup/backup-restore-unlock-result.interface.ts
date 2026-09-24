export default interface BackupRestoreUnlockResult {
  readonly status: 'unlocked';
  readonly selectionId: string;
  readonly backupId: string;
}
