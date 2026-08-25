import VentasHistoricoService from '@backend/application/ventas/ventas-historico.service';
import type VentasPostventaRepository from '@backend/contracts/ventas/ventas-postventa.repository.interface';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';

export default class VentasPostventaService {
  constructor(
    private readonly repository: VentasPostventaRepository,
    private readonly ventasHistoricoService: VentasHistoricoService,
  ) {}

  /**
   * Cambia el cliente de una venta y devuelve
   * su detalle histórico autoritativo actualizado.
   */
  async cambiarCliente(
    command: VentaPostventaCambiarClienteCommand,
  ): Promise<VentaHistoricoDetalle> {
    const idVenta: number = this.requireVentaId(command.idVenta);

    const clientePublicId: string | null =
      command.clientePublicId === null
        ? null
        : this.requirePublicId(
            command.clientePublicId,
            'El identificador del cliente no es válido.',
          );

    await this.repository.cambiarCliente(idVenta, clientePublicId);

    return this.requireDetalleActualizado(idVenta);
  }

  /**
   * Cambia el único medio de pago de una venta y devuelve
   * su detalle histórico autoritativo actualizado.
   */
  async cambiarTipoPago(
    command: VentaPostventaCambiarTipoPagoCommand,
  ): Promise<VentaHistoricoDetalle> {
    const idVenta: number = this.requireVentaId(command.idVenta);

    const tipoPagoPublicId: string = this.requirePublicId(
      command.tipoPagoPublicId,
      'El identificador del tipo de pago no es válido.',
    );

    await this.repository.cambiarTipoPago(idVenta, tipoPagoPublicId);

    return this.requireDetalleActualizado(idVenta);
  }

  /**
   * Valida un identificador numérico interno de venta.
   */
  private requireVentaId(value: number): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('El identificador de la venta no es válido.');
    }

    return value;
  }

  /**
   * Normaliza un publicId requerido.
   */
  private requirePublicId(value: string, message: string): string {
    if (typeof value !== 'string') {
      throw new Error(message);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(message);
    }

    return normalizedValue;
  }

  /**
   * Recupera el detalle actualizado después de una corrección postventa.
   */
  private async requireDetalleActualizado(idVenta: number): Promise<VentaHistoricoDetalle> {
    const detalle: VentaHistoricoDetalle | null =
      await this.ventasHistoricoService.findDetalleByVentaId(idVenta);

    if (detalle === null) {
      throw new Error('La venta modificada ya no se encuentra disponible.');
    }

    return detalle;
  }
}
