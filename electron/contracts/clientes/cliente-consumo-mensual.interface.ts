export interface ClienteConsumoMensualConsulta {
  readonly clientePublicId: string;
  readonly year: number | null;
  readonly month: number | null;
}

export interface ClienteConsumoMensualPoint {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  readonly importeMicros: number;
}

export interface ClienteConsumoMensualResultado {
  readonly availableYears: readonly number[];
  readonly points: readonly ClienteConsumoMensualPoint[];
  readonly totalMicros: number;
}
