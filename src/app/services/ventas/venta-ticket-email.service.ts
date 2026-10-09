import { inject, Service } from '@angular/core';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import VentaTicketDocumentService from '@services/ventas/venta-ticket-document.service';

@Service()
export default class VentaTicketEmailService {
  private readonly ventaTicketDocumentService: VentaTicketDocumentService = inject(
    VentaTicketDocumentService,
  );

  /**
   * Garantiza que exista el PDF vigente y solicita
   * después su envío al backend de Electron.
   *
   * Las incidencias documentales quedan registradas
   * por VentaTicketDocumentService en su punto de origen.
   */
  async send(idVenta: number, destinatario: string): Promise<void> {
    await this.ventaTicketDocumentService.ensureCurrentPdf(idVenta);

    const command: VentaTicketEmailCommand = {
      idVenta,
      destinatario,
    };

    await window.osumiDesktop.ventas.sendTicketEmail(command);
  }
}
