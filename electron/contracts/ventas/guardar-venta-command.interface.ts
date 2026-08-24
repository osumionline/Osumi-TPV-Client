export interface GuardarVentaPagoCommand {
  readonly tipoPagoPublicId: string;
  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
}

export interface GuardarVentaLineaCommand {
  /**
   * NULL identifica una línea libre como Varios
   * o un artículo histórico que ya no exista.
   */
  readonly articuloPublicId: string | null;
  /**
   * Snapshot del localizador y la marca mostrados
   * en el momento en que se finaliza la venta.
   */
  readonly localizador: number;
  readonly marca: string;
  /**
   * Snapshot histórico de la línea tal y como
   * se ha vendido realmente.
   */
  readonly nombre: string;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly ivaBps: number;
  readonly importeMicros: number;
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
  readonly unidades: number;
  readonly regalo: boolean;
  /**
   * Solo una línea de devolución conserva esta referencia.
   *
   * El backend resolverá la línea original y actualizará
   * sus unidades devueltas dentro de la transacción.
   */
  readonly devolucionLineaOrigenPublicId: string | null;
  /**
   * Identifica la línea concreta de reserva de la que
   * procede esta línea cuando corresponda.
   */
  readonly reservaLineaOrigenPublicId: string | null;
}

export interface GuardarVentaCommand {
  /**
   * Identificador estable e idempotente de la operación.
   *
   * Se utilizará también como public_id de la venta
   * persistida.
   */
  readonly publicId: string;

  /**
   * Contexto operativo con el que el frontend comenzó
   * a finalizar la operación.
   */
  readonly cajaPublicId: string;
  readonly empleadoPublicId: string;
  readonly clientePublicId: string | null;

  /**
   * Una operación puede contener devoluciones de una
   * única venta histórica en el modelo actual.
   */
  readonly devolucionVentaOrigenPublicId: string | null;

  /**
   * Conservamos todas las reservas originales aunque
   * alguna de sus líneas haya sido eliminada de la venta.
   */
  readonly reservasOrigenPublicIds: readonly string[];

  readonly totalCents: number;
  readonly lineas: readonly GuardarVentaLineaCommand[];
  readonly pagos: readonly GuardarVentaPagoCommand[];
}
