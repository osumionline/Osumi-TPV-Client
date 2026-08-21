import { inject, Service } from '@angular/core';

import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import buildVentaTicketDocument from '@model/ventas/venta-ticket-document.builder';
import VentasContextService from '@services/ventas-context.service';
import VentasTicketsService from '@services/ventas-tickets.service';

@Service()
export default class VentaTicketDocumentService {
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);

  private readonly ventasTicketsService: VentasTicketsService = inject(VentasTicketsService);

  /**
   * Recupera el snapshot definitivo de SQLite y construye
   * el HTML autocontenido correspondiente a esa venta.
   */
  async buildHtml(idVenta: number): Promise<string> {
    const ticket: VentaTicketInterface | null =
      await this.ventasTicketsService.getByVentaId(idVenta);

    if (ticket === null) {
      throw new Error('No se ha podido recuperar la venta para generar su ticket.');
    }

    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      throw new Error('No se han podido obtener los datos del negocio para generar el ticket.');
    }

    return buildVentaTicketDocument(appData, ticket);
  }

  /**
   * Genera el PDF definitivo de una venta ya persistida
   * y lo conserva como artefacto histórico write-once.
   */
  async generateAndSavePdf(idVenta: number): Promise<void> {
    const documentHtml: string = await this.buildHtml(idVenta);

    const pdf: Uint8Array = await window.osumiDesktop.printing.renderPdf(documentHtml);

    await this.ventasTicketsService.savePdf(idVenta, pdf);
  }

  /**
   * Imprime silenciosamente el ticket definitivo de una
   * venta ya persistida utilizando la impresora configurada.
   */
  async print(idVenta: number): Promise<void> {
    const documentHtml: string = await this.buildHtml(idVenta);

    await window.osumiDesktop.printing.printTicket(documentHtml);
  }
}
