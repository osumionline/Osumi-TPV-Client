export interface SalidaCajaConsulta {
  /**
   * Primera fecha local incluida, en formato YYYY-MM-DD.
   */
  readonly desde: string;

  /**
   * Última fecha local incluida, en formato YYYY-MM-DD.
   */
  readonly hasta: string;
}

export interface SalidaCajaInterface {
  readonly publicId: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importeCents: number;
  readonly fecha: string;

  /**
   * Indica si la salida pertenece todavía a una caja abierta
   * y, por tanto, puede modificarse.
   */
  readonly editable: boolean;
}
