import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
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

  /**
   * Recupera la cabecera persistida de un pedido.
   */
  getPedido(idPedido: number): Promise<PedidoCabeceraInterface | null>;

  /**
   * Recupera las líneas persistidas de un pedido.
   */
  getPedidoLineas(idPedido: number): Promise<readonly PedidoLineaInterface[]>;

  /**
   * Recupera las opciones disponibles para editar una ficha de Pedido.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsInterface>;

  /**
   * Crea o actualiza la cabecera de un pedido.
   */
  savePedido(command: PedidoSaveCommand): Promise<number>;

  /**
   * Elimina lógicamente un pedido todavía pendiente.
   */
  deletePedido(idPedido: number): Promise<void>;

  /**
   * Resuelve un artículo mediante un código introducido
   * o escaneado en la ficha de Pedido.
   */
  resolvePedidoArticulo(codigo: string): Promise<PedidoArticuloInterface | null>;

  /**
   * Busca artículos activos mediante texto libre.
   */
  searchPedidoArticulos(texto: string): Promise<readonly PedidoArticuloInterface[]>;
}
