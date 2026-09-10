import type PedidoFilterQuery from '@backend/contracts/compras/pedidos/pedido-filter-query.interface';

export default interface PedidoRepositoryQuery extends PedidoFilterQuery {
  readonly offset: number;
  readonly limit: number;
}
