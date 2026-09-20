export default interface ReordenarTiposPagoCommand {
  /**
   * Identificadores de todos los tipos de pago
   * configurables activos en el nuevo orden.
   *
   * Efectivo no debe formar parte de esta colección.
   */
  readonly ids: readonly number[];
}
