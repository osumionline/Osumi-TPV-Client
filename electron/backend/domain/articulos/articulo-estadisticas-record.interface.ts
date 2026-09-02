export interface ArticuloEstadisticasAggregateRecord {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  readonly value: number;
}

export interface ArticuloEstadisticasRepositoryResult {
  readonly years: readonly number[];
  readonly items: readonly ArticuloEstadisticasAggregateRecord[];
}
