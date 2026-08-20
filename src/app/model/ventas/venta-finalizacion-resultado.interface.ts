export interface VentaPagoFinalizado {
  /**
   * Identificador estable del tipo de pago.
   *
   * El backend resolverá posteriormente su ID interno
   * y sus propiedades persistidas.
   */
  readonly tipoPagoPublicId: string;

  /**
   * Cantidad aplicada al total de la operación.
   *
   * Es negativa cuando la operación completa representa
   * una devolución neta.
   */
  readonly importeCents: number;

  /**
   * Cantidad físicamente entregada por el cliente.
   *
   * Solo se utiliza actualmente en pagos positivos
   * realizados en efectivo.
   */
  readonly entregadoCents: number | null;

  /**
   * Cambio entregado al cliente.
   */
  readonly cambioCents: number;
}

/**
 * Snapshot económico definitivo producido por el proceso
 * temporal de finalización.
 *
 * No contiene modelos Angular ni referencias mutables a
 * tipos de pago.
 */
export interface VentaFinalizacionResultado {
  readonly totalCents: number;

  /**
   * El orden del array representa el orden de los pagos.
   *
   * Ventas 11 podrá utilizar su índice para rellenar
   * venta_pago.orden.
   */
  readonly pagos: readonly VentaPagoFinalizado[];
}
