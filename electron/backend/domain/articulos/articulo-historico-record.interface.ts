export interface ArticuloHistoricoRecord {
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

export interface ArticuloHistoricoPageRecord {
  readonly items: readonly ArticuloHistoricoRecord[];
  readonly total: number;
}
