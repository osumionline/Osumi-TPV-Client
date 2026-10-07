export default interface BackupAutomaticSchedule {
  readonly latestScheduledAt: string;
  readonly nextScheduledAt: string;
  readonly pending: boolean;
}
