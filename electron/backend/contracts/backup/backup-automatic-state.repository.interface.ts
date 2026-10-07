import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';

/**
 * Persistencia local del estado de las
 * copias automáticas.
 */
export default interface BackupAutomaticStateRepository {
  /**
   * Recupera el estado persistido.
   *
   * Devuelve null cuando todavía no existe
   * ningún estado válido.
   */
  load(): Promise<BackupAutomaticState | null>;

  /**
   * Sustituye atómicamente el estado actual.
   */
  save(state: BackupAutomaticState): Promise<void>;
}
