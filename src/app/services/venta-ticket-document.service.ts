import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import buildVentaTicketDocument from '@model/ventas/venta-ticket-document.builder';
import VentasContextService from '@services/ventas-context.service';
import VentasTicketsService from '@services/ventas-tickets.service';

interface VentaTicketDocumentSnapshot {
  readonly html: string;
  readonly ticketRevision: number;
}

@Service()
export default class VentaTicketDocumentService {
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);
  private readonly ventasTicketsService: VentasTicketsService = inject(VentasTicketsService);

  /**
   * Recupera el snapshot vigente y construye su HTML autocontenido.
   */
  async buildHtml(idVenta: number): Promise<string> {
    const document: VentaTicketDocumentSnapshot = await this.buildDocument(idVenta);

    return document.html;
  }

  /**
   * Genera el PDF de una revisión concreta y solicita
   * al backend que la materialice solo si sigue vigente.
   */
  async generateAndSavePdf(idVenta: number): Promise<void> {
    const document: VentaTicketDocumentSnapshot = await this.buildDocument(idVenta);

    const pdf: Uint8Array = await window.osumiDesktop.printing.renderPdf(document.html);

    await this.ventasTicketsService.savePdf(idVenta, document.ticketRevision, pdf);
  }

  /**
   * Imprime silenciosamente el snapshot vigente recuperado
   * en el instante de iniciar la impresión.
   */
  async print(idVenta: number): Promise<void> {
    const document: VentaTicketDocumentSnapshot = await this.buildDocument(idVenta);

    await window.osumiDesktop.printing.printTicket(document.html);
  }

  /**
   * Construye conjuntamente el HTML y la revisión exacta
   * a la que pertenece ese contenido.
   */
  private async buildDocument(idVenta: number): Promise<VentaTicketDocumentSnapshot> {
    const ticket: VentaTicketInterface | null =
      await this.ventasTicketsService.getByVentaId(idVenta);

    if (ticket === null) {
      throw new Error('No se ha podido recuperar la venta para generar su ticket.');
    }

    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      throw new Error('No se han podido obtener los datos del negocio para generar el ticket.');
    }

    return {
      html: buildVentaTicketDocument(appData, ticket),
      ticketRevision: ticket.ticketRevision,
    };
  }
}
