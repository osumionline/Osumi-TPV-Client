export const DEFAULT_BACKUP_AUTOMATIC_TIME: string = '03:00';

/**
 * Comprueba si un valor representa una hora local
 * válida en formato HH:mm.
 */
export function isBackupAutomaticTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
