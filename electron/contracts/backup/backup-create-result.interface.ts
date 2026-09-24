export default interface BackupCreateResult {
  readonly backupId: string;
  readonly createdAt: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}
