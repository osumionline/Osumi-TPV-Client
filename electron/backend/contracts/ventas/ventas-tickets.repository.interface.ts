import type { VentaTicketRecord } from '@backend/domain/ventas/venta-ticket-record.interface';

export default interface VentasTicketsRepository {
  findByVentaId(idVenta: number): Promise<VentaTicketRecord | null>;
}
