export default interface ActualizarTipoPagoCommand {
  readonly nombre: string;
  readonly afectaCaja: boolean;
  readonly fisico: boolean;

  /**
   * Nuevo logo staged que sustituirá al actual.
   *
   * null conserva el logo ya persistido.
   */
  readonly logoStagingId: string | null;
}
