import { Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import buildReservaTicketDocument from '@model/reservas/reserva-ticket-document.builder';

@Service()
export default class ReservaTicketPrintService {
  /**
   * Construye el comprobante correspondiente a una reserva
   * ya persistida y lo envía silenciosamente a la impresora
   * de tickets configurada para este equipo.
   */
  async print(appData: AppData, reserva: ReservaInterface): Promise<void> {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    await window.osumiDesktop.printing.printTicket(documentHtml);
  }
}
