import type { VentaTicketRecord } from '@backend/domain/ventas/venta-ticket-record.interface';

export default interface VentasTicketsRepository {
  /**
   * Recupera el snapshot documental actual de una venta.
   */
  findByVentaId(idVenta: number): Promise<VentaTicketRecord | null>;

  /**
   * Marca una revisión como materializada únicamente si
   * sigue siendo la revisión documental vigente.
   */
  markPdfRevision(idVenta: number, expectedRevision: number): Promise<boolean>;
}
