import VentasHistoricoService from '@backend/application/ventas/ventas-historico.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type VentasPostventaRepository from '@backend/contracts/ventas/ventas-postventa.repository.interface';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';

export default class VentasPostventaService {
  /**
   * Crea el servicio encargado de las correcciones
   * posteriores a una venta ya confirmada.
   */
  constructor(
    private readonly repository: VentasPostventaRepository,
    private readonly ventasHistoricoService: VentasHistoricoService,
    private readonly applicationLogger: ApplicationLogger,
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

    try {
      await this.repository.cambiarCliente(idVenta, clientePublicId);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'post-sale-change-client',
        message: 'No se ha podido cambiar el cliente de una venta histórica.',
        error,
        context: {
          idVenta,
          hasClient: clientePublicId !== null,
        },
      });

      throw error;
    }

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

    try {
      await this.repository.cambiarTipoPago(idVenta, tipoPagoPublicId);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'post-sale-change-payment-type',
        message: 'No se ha podido cambiar el tipo de pago de una venta histórica.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

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
   *
   * Los errores técnicos de lectura son registrados por
   * VentasHistoricoService. Aquí solo registramos la inconsistencia
   * de que la venta desaparezca después de una corrección confirmada.
   */
  private async requireDetalleActualizado(idVenta: number): Promise<VentaHistoricoDetalle> {
    const detalle: VentaHistoricoDetalle | null =
      await this.ventasHistoricoService.findDetalleByVentaId(idVenta);

    if (detalle === null) {
      const error: Error = new Error('La venta modificada ya no se encuentra disponible.');

      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'post-sale-refresh-detail',
        message:
          'La corrección postventa se ha guardado, pero no se ha podido recuperar el detalle actualizado.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

    return detalle;
  }
}
