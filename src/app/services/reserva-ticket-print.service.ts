import { Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import buildReservaTicketDocument from '@model/reservas/reserva-ticket-document.builder';
import { printHtmlDocument } from '@utils/print.utils';

@Service()
export default class ReservaTicketPrintService {
  /**
   * Abre el comprobante de una reserva persistida
   * y muestra automáticamente el diálogo de impresión.
   */
  print(appData: AppData, reserva: ReservaInterface): void {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    printHtmlDocument(documentHtml, {
      openErrorMessage: 'No se ha podido abrir la ventana del comprobante de reserva.',
      windowFeatures: 'popup=yes,width=520,height=900',
    });
  }
}
