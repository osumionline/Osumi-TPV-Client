export type ArticuloHistoricoSortField =
  | 'createdAt'
  | 'tipo'
  | 'stockPrevio'
  | 'diferencia'
  | 'stockFinal'
  | 'pucMicros'
  | 'pvpMicros'
  | 'idVenta'
  | 'idPedido';

export type ArticuloHistoricoSortDirection = 'asc' | 'desc';

export interface ArticuloHistoricoConsulta {
  readonly idArticulo: number;
  readonly pagina: number;
  readonly num: number;
  readonly orderBy: ArticuloHistoricoSortField;
  readonly orderDirection: ArticuloHistoricoSortDirection;
}

export interface ArticuloHistoricoItem {
  readonly id: number;
  readonly publicId: string;
  readonly tipo: number;
  readonly stockPrevio: number;
  readonly diferencia: number;
  readonly stockFinal: number;
  readonly idVenta: number | null;
  readonly idPedido: number | null;
  readonly idMermaCaducidad: number | null;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly createdAt: string;
}

export interface ArticuloHistoricoResultado {
  readonly items: readonly ArticuloHistoricoItem[];
  readonly total: number;
}
