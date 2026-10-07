/**
 * Estado resuelto de la programación automática
 * para el instante consultado.
 */
export default interface BackupAutomaticStatus {
  readonly automaticTime: string;
  readonly lastSuccessfulAt: string | null;
  readonly latestScheduledAt: string;
  readonly nextScheduledAt: string;
  readonly pending: boolean;
}
