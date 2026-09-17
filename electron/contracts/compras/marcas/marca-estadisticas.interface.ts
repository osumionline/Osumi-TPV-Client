export type MarcaEstadisticasTipo = 'amount' | 'units';

export interface MarcaEstadisticasConsulta {
  readonly idMarca: number;
  readonly tipo: MarcaEstadisticasTipo;
  readonly year: number | null;
  readonly month: number | null;
}

export interface MarcaEstadisticasPoint {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;

  /**
   * Unidades cuando tipo === 'units'.
   * Microeuros cuando tipo === 'amount'.
   */
  readonly value: number;
}

export interface MarcaEstadisticasResultado {
  readonly tipo: MarcaEstadisticasTipo;
  readonly availableYears: readonly number[];
  readonly points: readonly MarcaEstadisticasPoint[];

  /**
   * Unidades cuando tipo === 'units'.
   * Microeuros cuando tipo === 'amount'.
   */
  readonly total: number;
}
