import type {
  PedidoFilterOptionsRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';

/**
 * Define el acceso a los datos de listados de Pedidos.
 */
export default interface PedidosRepository {
  /**
   * Recupera una página de pedidos pendientes.
   */
  searchPedidosGuardados(query: PedidoRepositoryQuery): Promise<PedidosGuardadosResultadoRecord>;

  /**
   * Recupera una página de pedidos recepcionados.
   */
  searchPedidosRecepcionados(
    query: PedidoRepositoryQuery,
  ): Promise<PedidosRecepcionadosResultadoRecord>;

  /**
   * Recupera proveedores utilizables en los filtros de Pedidos.
   */
  getPedidoFilterOptions(): Promise<PedidoFilterOptionsRecord>;
}
