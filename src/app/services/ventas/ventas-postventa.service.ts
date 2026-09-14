import { Service } from '@angular/core';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';

@Service()
export default class VentasPostventaService {
  /**
   * Cambia el cliente asociado a una venta histórica
   * y devuelve su detalle autoritativo actualizado.
   */
  async cambiarCliente(
    command: VentaPostventaCambiarClienteCommand,
  ): Promise<VentaHistoricoDetalle> {
    return window.osumiDesktop.ventas.cambiarCliente(command);
  }

  /**
   * Cambia el único medio de pago de una venta histórica
   * y devuelve su detalle autoritativo actualizado.
   */
  async cambiarTipoPago(
    command: VentaPostventaCambiarTipoPagoCommand,
  ): Promise<VentaHistoricoDetalle> {
    return window.osumiDesktop.ventas.cambiarTipoPago(command);
  }
}
