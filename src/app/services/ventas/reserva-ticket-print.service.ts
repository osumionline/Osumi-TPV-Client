import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/ventas/reservas/reserva.interface';
import buildReservaTicketDocument from '@model/reservas/reserva-ticket-document.builder';
import ApplicationLoggingService from '@services/application/application-logging.service';

@Service()
export default class ReservaTicketPrintService {
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);

  /**
   * Construye el comprobante correspondiente a una reserva
   * ya persistida y lo envía silenciosamente a la impresora
   * de tickets configurada para este equipo.
   *
   * Una incidencia nunca modifica el estado de la reserva,
   * que ya se encuentra confirmada antes de imprimir.
   */
  async print(appData: AppData, reserva: ReservaInterface): Promise<void> {
    try {
      const documentHtml: string = buildReservaTicketDocument(appData, reserva);

      await window.osumiDesktop.printing.printTicket(documentHtml);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'print-reservation-receipt',
        message: 'No se ha podido imprimir el comprobante de una reserva.',
        error,
        context: {
          reservaId: reserva.id,
        },
      });

      throw error;
    }
  }
}
