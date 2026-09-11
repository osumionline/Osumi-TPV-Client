import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type {
  PedidoFilterOptionsInterface,
  PedidoListadoConsulta,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';

/**
 * Expone los casos de uso disponibles del módulo Compras.
 */
export default interface ComprasApi {
  /**
   * Recupera una página filtrada de pedidos todavía pendientes.
   */
  searchPedidosGuardados(consulta: PedidoListadoConsulta): Promise<PedidosGuardadosResultado>;

  /**
   * Recupera una página filtrada de pedidos ya recepcionados.
   */
  searchPedidosRecepcionados(
    consulta: PedidoListadoConsulta,
  ): Promise<PedidosRecepcionadosResultado>;

  /**
   * Recupera los proveedores disponibles para filtrar pedidos.
   */
  getPedidoFilterOptions(): Promise<PedidoFilterOptionsInterface>;

  getPedido(idPedido: number): Promise<PedidoCabeceraInterface | null>;

  getPedidoFormOptions(): Promise<PedidoFormOptionsInterface>;

  savePedido(command: PedidoSaveCommand): Promise<number>;

  deletePedido(idPedido: number): Promise<void>;
}
