import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
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
   * Recupera los PDFs relacionados con un Pedido.
   */
  getPedidoArchivos(idPedido: number): Promise<readonly PedidoArchivoInterface[]>;

  /**
   * Solicita y adjunta un PDF al Pedido indicado.
   * Devuelve null cuando el selector se cancela.
   */
  attachPedidoPdf(idPedido: number): Promise<PedidoArchivoInterface | null>;

  /**
   * Abre un PDF relacionado con un Pedido.
   */
  openPedidoPdf(idPedido: number, idPedidoArchivo: number): Promise<void>;

  /**
   * Elimina un PDF relacionado con un Pedido.
   */
  deletePedidoPdf(idPedido: number, idPedidoArchivo: number): Promise<void>;

  /**
   * Recupera las opciones disponibles para editar una ficha de Pedido.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsInterface>;

  /**
   * Crea o actualiza un pedido pendiente
   * junto con sus líneas.
   */
  savePedido(command: PedidoSaveCommand): Promise<number>;

  /**
   * Elimina lógicamente un pedido todavía pendiente.
   */
  deletePedido(idPedido: number): Promise<void>;

  /**
   * Recupera un artículo activo por ID para
   * incorporarlo a un Pedido.
   */
  getPedidoArticuloById(idArticulo: number): Promise<PedidoArticuloInterface | null>;

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
