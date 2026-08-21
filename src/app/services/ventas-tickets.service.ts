import { Service } from '@angular/core';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';

@Service()
export default class VentasTicketsService {
  /**
   * Recupera desde SQLite el snapshot definitivo
   * necesario para generar el ticket de una venta.
   */
  async getByVentaId(idVenta: number): Promise<VentaTicketInterface | null> {
    return window.osumiDesktop.ventas.getTicket(idVenta);
  }

  /**
   * Conserva en el backend el PDF histórico
   * correspondiente a una venta persistida.
   */
  async savePdf(idVenta: number, pdf: Uint8Array): Promise<void> {
    await window.osumiDesktop.ventas.saveTicketPdf(idVenta, pdf);
  }
}
