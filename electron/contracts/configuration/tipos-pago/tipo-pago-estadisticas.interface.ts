export interface TipoPagoEstadisticasConsulta {
  readonly idTipoPago: number;
  readonly year: number | null;
  readonly month: number | null;
}

export interface TipoPagoEstadisticasPoint {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;

  /**
   * Importe neto cobrado con el tipo de pago
   * durante este período, expresado en céntimos.
   */
  readonly importeCents: number;
}

export interface TipoPagoEstadisticasResultado {
  readonly availableYears: readonly number[];
  readonly points: readonly TipoPagoEstadisticasPoint[];

  /**
   * Importe neto cobrado con el tipo seleccionado
   * durante todo el período, en céntimos.
   */
  readonly totalImporteCents: number;

  /**
   * Número de ventas distintas que utilizaron
   * este tipo de pago durante el período.
   */
  readonly operaciones: number;

  /**
   * Importe neto medio por operación, en céntimos.
   */
  readonly importeMedioCents: number;

  /**
   * Peso del tipo de pago sobre el importe neto
   * total cobrado durante el período.
   *
   * 10000 representa 100,00 %.
   */
  readonly porcentajeTotalBps: number;
}
