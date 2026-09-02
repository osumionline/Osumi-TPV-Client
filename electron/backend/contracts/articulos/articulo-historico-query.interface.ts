export default interface ArticuloHistoricoRepositoryQuery {
  readonly idArticulo: number;
  readonly offset: number;
  readonly limit: number;
  readonly orderBy:
    | 'createdAt'
    | 'tipo'
    | 'stockPrevio'
    | 'diferencia'
    | 'stockFinal'
    | 'pucMicros'
    | 'pvpMicros'
    | 'idVenta'
    | 'idPedido';
  readonly orderDirection: 'asc' | 'desc';
}
