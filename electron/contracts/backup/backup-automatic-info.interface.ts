/**
 * Información pública sobre la programación
 * de las copias remotas automáticas.
 */
export default interface BackupAutomaticInfo {
  readonly automaticTime: string;
  readonly lastSuccessfulAt: string | null;
  readonly latestScheduledAt: string;
  readonly nextScheduledAt: string;
  readonly pending: boolean;
}
