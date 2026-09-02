export type ArticuloEstadisticasTipo = 'unidades' | 'importe';

export interface ArticuloEstadisticasConsulta {
  readonly idArticulo: number;
  readonly tipo: ArticuloEstadisticasTipo;
  readonly year: number | null;
  readonly month: number | null;
}

export interface ArticuloEstadisticasPoint {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  /**
   * Unidades cuando tipo === 'unidades'.
   * Microeuros cuando tipo === 'importe'.
   */
  readonly value: number;
}

export interface ArticuloEstadisticasResultado {
  readonly tipo: ArticuloEstadisticasTipo;
  readonly availableYears: readonly number[];
  readonly points: readonly ArticuloEstadisticasPoint[];
  /**
   * Unidades cuando tipo === 'unidades'.
   * Microeuros cuando tipo === 'importe'.
   */
  readonly total: number;
}
