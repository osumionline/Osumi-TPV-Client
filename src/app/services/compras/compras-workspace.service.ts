import { Service, signal, type Signal, type WritableSignal } from '@angular/core';
import type ComprasSection from '@model/compras/compras-section.type';
import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';

/**
 * Mantiene el estado visual del módulo Compras
 * durante la sesión actual de la aplicación.
 */
@Service()
export default class ComprasWorkspaceService {
  private pedidosGuardadosState: PedidoListadoWorkspaceState | null = null;
  private pedidosRecepcionadosState: PedidoListadoWorkspaceState | null = null;
  private readonly activeSectionSignal: WritableSignal<ComprasSection> =
    signal<ComprasSection>('orders');

  readonly activeSection: Signal<ComprasSection> = this.activeSectionSignal.asReadonly();

  /**
   * Conserva la sección activa del módulo de Compras
   * durante toda la sesión de la aplicación.
   */
  selectSection(section: ComprasSection): void {
    this.activeSectionSignal.set(section);
  }

  /**
   * Limpia el estado visual conservado del módulo
   * y restaura Pedidos como sección inicial.
   */
  clear(): void {
    this.pedidosGuardadosState = null;
    this.pedidosRecepcionadosState = null;
    this.activeSectionSignal.set('orders');
  }

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
