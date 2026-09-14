import { Service } from '@angular/core';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';

@Service()
export default class VentasTicketsService {
  /**
   * Recupera desde SQLite el snapshot documental
   * vigente de una venta.
   */
  async getByVentaId(idVenta: number): Promise<VentaTicketInterface | null> {
    return window.osumiDesktop.ventas.getTicket(idVenta);
  }

  /**
   * Recupera el PDF únicamente cuando representa
   * la revisión documental vigente.
   */
  async getCurrentPdf(idVenta: number): Promise<Uint8Array | null> {
    return window.osumiDesktop.ventas.getTicketPdf(idVenta);
  }

  /**
   * Conserva el PDF correspondiente exactamente
   * a la revisión documental indicada.
   */
  async savePdf(idVenta: number, ticketRevision: number, pdf: Uint8Array): Promise<void> {
    await window.osumiDesktop.ventas.saveTicketPdf(idVenta, ticketRevision, pdf);
  }
}
