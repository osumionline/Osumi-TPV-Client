import type VentaDevolucionRecord from '@backend/domain/ventas/venta-devolucion-record.interface';

export default interface VentasDevolucionesRepository {
  findByVentaId(idVenta: number): Promise<VentaDevolucionRecord | null>;
}
