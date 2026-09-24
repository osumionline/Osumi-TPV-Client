export default interface BackupRestoreFinalizeResult {
  readonly status: 'installed';
  readonly selectionId: string;
  readonly backupId: string;
}
