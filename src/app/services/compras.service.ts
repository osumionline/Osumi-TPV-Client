import { Service } from '@angular/core';
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
}
