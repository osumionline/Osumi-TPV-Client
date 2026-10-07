import type BackupAutomaticExecutionResult from '@backend/domain/backup/backup-automatic-execution-result.interface';

/**
 * Evalúa y ejecuta el ciclo de copia
 * automática cuando corresponde.
 */
export default interface BackupAutomaticExecutor {
  /**
   * Ejecuta una evaluación del ciclo automático.
   */
  execute(): Promise<BackupAutomaticExecutionResult>;
}
