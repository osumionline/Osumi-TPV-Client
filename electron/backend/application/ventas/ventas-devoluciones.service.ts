import type VentasDevolucionesRepository from '@backend/contracts/ventas/ventas-devoluciones.repository.interface';
import type VentaDevolucionRecord from '@backend/domain/ventas/venta-devolucion-record.interface';
import type {
  VentaDevolucionLineaRecord,
  VentaDevolucionPagoRecord,
} from '@backend/domain/ventas/venta-devolucion-record.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type {
  VentaDevolucionLineaInterface,
  VentaDevolucionPagoInterface,
} from '@desktop-contracts/ventas/venta-devolucion.interface';

export default class VentasDevolucionesService {
  constructor(private readonly ventasDevolucionesRepository: VentasDevolucionesRepository) {}

  /**
   * Recupera una venta histórica mediante el identificador
   * codificado en el QR de sus tickets.
   */
  async getByVentaId(idVenta: number): Promise<VentaDevolucionInterface | null> {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }

    const venta: VentaDevolucionRecord | null =
      await this.ventasDevolucionesRepository.findByVentaId(idVenta);

    if (venta === null) {
      return null;
    }

    return {
      id: venta.id,
      publicId: venta.publicId,

      serie: venta.serie,
      numero: venta.numero,

      fecha: venta.fecha,
      cliente: venta.cliente,

      totalCents: venta.totalCents,

      pagos: venta.pagos.map((pago: VentaDevolucionPagoRecord): VentaDevolucionPagoInterface => ({
        nombre: pago.nombre,
        importeCents: pago.importeCents,
      })),

      lineas: venta.lineas.map(
        (linea: VentaDevolucionLineaRecord): VentaDevolucionLineaInterface => ({
          id: linea.id,
          publicId: linea.publicId,

          idArticulo: linea.idArticulo,
          articuloPublicId: linea.articuloPublicId,
          localizador: linea.localizador,

          nombre: linea.nombre,

          pucMicros: linea.pucMicros,
          pvpMicros: linea.pvpMicros,
          ivaBps: linea.ivaBps,

          importeMicros: linea.importeMicros,

          descuentoBps: linea.descuentoBps,
          importeDescuentoMicros: linea.importeDescuentoMicros,

          unidades: linea.unidades,
          unidadesDevueltas: linea.unidadesDevueltas,
          unidadesDisponibles: linea.unidadesDisponibles,

          regalo: linea.regalo,
        }),
      ),
    };
  }
}
