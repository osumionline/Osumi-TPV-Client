import { Service } from '@angular/core';
import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';

/**
 * Mantiene el estado visual del módulo Compras
 * durante la sesión actual de la aplicación.
 */
@Service()
export default class ComprasWorkspaceService {
  private pedidosGuardadosState: PedidoListadoWorkspaceState | null = null;
  private pedidosRecepcionadosState: PedidoListadoWorkspaceState | null = null;

  /**
   * Recupera el último estado conocido del listado de pedidos guardados.
   */
  getPedidosGuardadosState(): PedidoListadoWorkspaceState | null {
    return this.pedidosGuardadosState === null ? null : { ...this.pedidosGuardadosState };
  }

  /**
   * Conserva el estado del listado de pedidos guardados.
   */
  setPedidosGuardadosState(state: PedidoListadoWorkspaceState): void {
    this.pedidosGuardadosState = { ...state };
  }

  /**
   * Recupera el último estado conocido del listado de pedidos recepcionados.
   */
  getPedidosRecepcionadosState(): PedidoListadoWorkspaceState | null {
    return this.pedidosRecepcionadosState === null ? null : { ...this.pedidosRecepcionadosState };
  }

  /**
   * Conserva el estado del listado de pedidos recepcionados.
   */
  setPedidosRecepcionadosState(state: PedidoListadoWorkspaceState): void {
    this.pedidosRecepcionadosState = { ...state };
  }
}
