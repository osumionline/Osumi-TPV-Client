import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import buildVentaGiftTicketDocument from '@model/ventas/venta-gift-ticket-document.builder';
import buildVentaTicketDocument from '@model/ventas/venta-ticket-document.builder';
import ApplicationLoggingService from '@services/application/application-logging.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import VentasTicketsService from '@services/ventas/ventas-tickets.service';

interface VentaTicketDocumentSnapshot {
  readonly html: string;
  readonly ticketRevision: number;
}

@Service()
export default class VentaTicketDocumentService {
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);
  private readonly ventasTicketsService: VentasTicketsService = inject(VentasTicketsService);
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);

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
   *
   * Cualquier incidencia de construcción, renderizado
   * o persistencia se registra aquí como único origen funcional.
   */
  async generateAndSavePdf(idVenta: number): Promise<void> {
    try {
      const document: VentaTicketDocumentSnapshot = await this.buildDocument(idVenta);

      const pdf: Uint8Array = await window.osumiDesktop.printing.renderPdf(document.html);

      await this.ventasTicketsService.savePdf(idVenta, document.ticketRevision, pdf);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'generate-ticket-pdf',
        message: 'No se ha podido generar o conservar el PDF histórico de un ticket.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }
  }

  /**
   * Garantiza que exista un PDF correspondiente
   * a la revisión documental actualmente vigente.
   *
   * La ausencia o desactualización del PDF es un estado normal.
   * Solo se registra un fallo técnico durante su comprobación.
   */
  async ensureCurrentPdf(idVenta: number): Promise<void> {
    const currentPdf: Uint8Array | null = await this.loadCurrentPdf(idVenta);

    if (currentPdf !== null) {
      return;
    }

    /*
     * generateAndSavePdf() registra sus propias incidencias.
     * No las capturamos aquí para evitar duplicarlas.
     */
    await this.generateAndSavePdf(idVenta);
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
   * Reimprime exactamente el PDF vigente de una venta.
   *
   * Si el PDF falta o está desactualizado, lo repara
   * primero mediante el pipeline documental revisionado.
   */
  async reprint(idVenta: number): Promise<void> {
    let pdf: Uint8Array | null = await this.loadCurrentPdf(idVenta);

    if (pdf === null) {
      /*
       * generateAndSavePdf() registra cualquier incidencia propia.
       * No la capturamos aquí para no duplicarla como reimpresión.
       */
      await this.generateAndSavePdf(idVenta);

      pdf = await this.loadCurrentPdf(idVenta);
    }

    if (pdf === null) {
      const error: Error = new Error('No se ha podido obtener el PDF vigente del ticket.');

      this.loggingService.warn({
        area: 'ventas',
        operation: 'reprint-ticket',
        message: 'No se ha podido reimprimir el PDF vigente de un ticket.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

    try {
      await window.osumiDesktop.printing.printPdf(pdf);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'reprint-ticket',
        message: 'No se ha podido reimprimir el PDF vigente de un ticket.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }
  }

  /**
   * Genera e imprime bajo demanda un ticket regalo
   * sin crear ni modificar ningún artefacto PDF histórico.
   *
   * Una operación sin líneas de compra es una precondición
   * de negocio y no genera una entrada de log.
   */
  async printGift(idVenta: number): Promise<void> {
    let ticket: VentaTicketInterface | null;

    try {
      ticket = await this.ventasTicketsService.getByVentaId(idVenta);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'print-gift-ticket',
        message: 'No se ha podido imprimir un ticket regalo.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

    if (ticket === null) {
      const error: Error = new Error(
        'No se ha podido recuperar la venta para generar su ticket regalo.',
      );

      this.loggingService.warn({
        area: 'ventas',
        operation: 'print-gift-ticket',
        message: 'No se ha podido imprimir un ticket regalo.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

    const hasPurchaseLines: boolean = ticket.lineas.some((linea): boolean => linea.unidades > 0);

    if (!hasPurchaseLines) {
      throw new Error(
        'No se puede generar un ticket regalo para una operación sin líneas de compra.',
      );
    }

    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      const error: Error = new Error(
        'No se han podido obtener los datos del negocio para generar el ticket regalo.',
      );

      this.loggingService.warn({
        area: 'ventas',
        operation: 'print-gift-ticket',
        message: 'No se ha podido imprimir un ticket regalo.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }

    try {
      const documentHtml: string = buildVentaGiftTicketDocument(appData, ticket);

      await window.osumiDesktop.printing.printTicket(documentHtml);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'print-gift-ticket',
        message: 'No se ha podido imprimir un ticket regalo.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }
  }

  /**
   * Recupera el PDF documental vigente y registra únicamente
   * los fallos técnicos producidos durante la comprobación.
   *
   * Un resultado null es normal: indica que el documento
   * falta físicamente o pertenece a una revisión anterior.
   */
  private async loadCurrentPdf(idVenta: number): Promise<Uint8Array | null> {
    try {
      return await this.ventasTicketsService.getCurrentPdf(idVenta);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'load-current-ticket-pdf',
        message: 'No se ha podido comprobar el PDF vigente de un ticket.',
        error,
        context: {
          idVenta,
        },
      });

      throw error;
    }
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
