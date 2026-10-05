/**
 * Describe una copia generada en disco
 * para uso interno del proceso principal.
 */
export default interface BackupCreatedFile {
  readonly backupId: string;
  readonly createdAt: string;
  readonly fileName: string;
  readonly filePath: string;
  readonly sizeBytes: number;
}
