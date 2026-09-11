import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type PedidoLineaRecord from '@backend/domain/compras/pedidos/pedido-linea-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';

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

  /**
   * Recupera la cabecera persistida de un pedido.
   */
  getPedido(idPedido: number): Promise<PedidoCabeceraRecord | null>;

  /**
   * Recupera las líneas persistidas de un pedido.
   */
  getPedidoLineas(idPedido: number): Promise<readonly PedidoLineaRecord[]>;

  /**
   * Recupera proveedores y tipos de pago disponibles
   * para editar la cabecera.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsRecord>;

  /**
   * Crea o actualiza la cabecera de un pedido.
   */
  savePedido(command: PedidoSaveRecord): Promise<number>;

  /**
   * Elimina lógicamente un pedido todavía pendiente.
   */
  deletePedido(idPedido: number): Promise<void>;
}
