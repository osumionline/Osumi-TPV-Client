import { Service } from '@angular/core';
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
 * Expone al frontend los casos de uso del módulo Compras.
 */
@Service()
export default class ComprasService {
  /**
   * Recupera una página de pedidos pendientes.
   */
  searchPedidosGuardados(consulta: PedidoListadoConsulta): Promise<PedidosGuardadosResultado> {
    return window.osumiDesktop.compras.searchPedidosGuardados(consulta);
  }

  /**
   * Recupera una página de pedidos recepcionados.
   */
  searchPedidosRecepcionados(
    consulta: PedidoListadoConsulta,
  ): Promise<PedidosRecepcionadosResultado> {
    return window.osumiDesktop.compras.searchPedidosRecepcionados(consulta);
  }

  /**
   * Recupera las opciones disponibles para filtrar pedidos.
   */
  getPedidoFilterOptions(): Promise<PedidoFilterOptionsInterface> {
    return window.osumiDesktop.compras.getPedidoFilterOptions();
  }

  /**
   * Recupera la cabecera de un pedido.
   */
  getPedido(idPedido: number): Promise<PedidoCabeceraInterface | null> {
    return window.osumiDesktop.compras.getPedido(idPedido);
  }

  /**
   * Recupera opciones para la ficha de Pedido.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsInterface> {
    return window.osumiDesktop.compras.getPedidoFormOptions();
  }

  /**
   * Crea o actualiza un pedido.
   */
  savePedido(command: PedidoSaveCommand): Promise<number> {
    return window.osumiDesktop.compras.savePedido(command);
  }

  /**
   * Elimina un pedido pendiente.
   */
  deletePedido(idPedido: number): Promise<void> {
    return window.osumiDesktop.compras.deletePedido(idPedido);
  }
}
