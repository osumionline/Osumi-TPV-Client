export interface MarcaEstadisticasAggregateRecord {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;
  readonly value: number;
}

export interface MarcaEstadisticasRepositoryResult {
  readonly years: readonly number[];
  readonly items: readonly MarcaEstadisticasAggregateRecord[];
}
