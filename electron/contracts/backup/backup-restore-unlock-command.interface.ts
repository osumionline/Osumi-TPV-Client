export default interface BackupRestoreUnlockCommand {
  readonly selectionId: string;

  /**
   * Se utiliza exactamente como se ha introducido,
   * sin trim ni normalización.
   */
  readonly backupApiKey: string;
}
