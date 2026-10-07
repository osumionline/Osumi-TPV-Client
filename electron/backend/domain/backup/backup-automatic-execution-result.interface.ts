import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';

/**
 * Resultado de una evaluación del mecanismo
 * de copias automáticas.
 */
export default interface BackupAutomaticExecutionResult {
  readonly outcome: 'not-installed' | 'not-configured' | 'not-pending' | 'busy' | 'created';

  readonly status: BackupAutomaticStatus | null;
}
