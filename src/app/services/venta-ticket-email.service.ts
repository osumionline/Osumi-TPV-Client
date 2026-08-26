import { inject, Service } from '@angular/core';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';
import VentasTicketsService from '@services/ventas-tickets.service';

@Service()
export default class VentaTicketEmailService {
  private readonly ventasTicketsService: VentasTicketsService = inject(VentasTicketsService);

  private readonly ventaTicketDocumentService: VentaTicketDocumentService = inject(
    VentaTicketDocumentService,
  );

  /**
   * Garantiza que exista el PDF vigente y solicita
   * después su envío al backend de Electron.
   */
  async send(idVenta: number, destinatario: string): Promise<void> {
    const currentPdf: Uint8Array | null = await this.ventasTicketsService.getCurrentPdf(idVenta);

    if (currentPdf === null) {
      await this.ventaTicketDocumentService.generateAndSavePdf(idVenta);
    }

    const command: VentaTicketEmailCommand = {
      idVenta,
      destinatario,
    };

    await window.osumiDesktop.ventas.sendTicketEmail(command);
  }
}
