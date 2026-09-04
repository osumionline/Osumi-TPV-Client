export interface ClienteUltimaVentaRecord {
  readonly fecha: string;
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly pvpMicros: number;
  readonly importeMicros: number;
}

export interface ClienteTopVentaRecord {
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly importeMicros: number;
}

export interface ClienteSumaVentaRecord {
  readonly year: number;
  readonly month: number;
  readonly pucMicros: number;
  readonly pvpMicros: number;
}

export interface ClienteConsumoMensualAggregateRecord {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  readonly importeMicros: number;
}

export interface ClienteConsumoMensualRepositoryResult {
  readonly years: readonly number[];
  readonly items: readonly ClienteConsumoMensualAggregateRecord[];
}
