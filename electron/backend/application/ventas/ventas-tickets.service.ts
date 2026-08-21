import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type {
  VentaTicketLineaRecord,
  VentaTicketPagoRecord,
  VentaTicketRecord,
} from '@backend/domain/ventas/venta-ticket-record.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
  VentaTicketPagoInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';

export default class VentasTicketsService {
  constructor(private readonly ventasTicketsRepository: VentasTicketsRepository) {}

  /**
   * Recupera el snapshot persistido necesario para generar
   * el ticket definitivo de una venta.
   */
  async getByVentaId(idVenta: number): Promise<VentaTicketInterface | null> {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }

    const venta: VentaTicketRecord | null =
      await this.ventasTicketsRepository.findByVentaId(idVenta);

    if (venta === null) {
      return null;
    }

    return {
      id: venta.id,
      publicId: venta.publicId,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      empleadoNombre: venta.empleadoNombre,
      clienteNombre: venta.clienteNombre,
      totalCents: venta.totalCents,
      pagos: venta.pagos.map((pago: VentaTicketPagoRecord): VentaTicketPagoInterface => ({
        nombre: pago.nombre,
        importeCents: pago.importeCents,
        entregadoCents: pago.entregadoCents,
        cambioCents: pago.cambioCents,
      })),
      lineas: venta.lineas.map((linea: VentaTicketLineaRecord): VentaTicketLineaInterface => ({
        nombre: linea.nombre,
        pvpMicros: linea.pvpMicros,
        ivaBps: linea.ivaBps,
        importeMicros: linea.importeMicros,
        descuentoBps: linea.descuentoBps,
        importeDescuentoMicros: linea.importeDescuentoMicros,
        unidades: linea.unidades,
        regalo: linea.regalo,
      })),
    };
  }
}
