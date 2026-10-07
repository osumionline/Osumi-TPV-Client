/**
 * Estado local de las copias automáticas.
 *
 * Este estado pertenece al terminal y no forma
 * parte del contenido portable de un `.otpv`.
 */
export default interface BackupAutomaticState {
  readonly schemaVersion: 1;
  readonly lastSuccessfulAt: string;
}
