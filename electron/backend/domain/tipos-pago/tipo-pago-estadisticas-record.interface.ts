export interface TipoPagoEstadisticasAggregateRecord {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;
  readonly importeCents: number;
}

export interface TipoPagoEstadisticasRepositoryResult {
  readonly years: readonly number[];
  readonly items: readonly TipoPagoEstadisticasAggregateRecord[];
  readonly totalImporteCents: number;
  readonly operaciones: number;
  readonly totalGlobalCents: number;
}
