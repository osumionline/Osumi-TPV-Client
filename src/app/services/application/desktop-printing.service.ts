import { Service } from '@angular/core';
import type PrinterInterface from '@desktop-contracts/configuration/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/configuration/printing/printing-settings.interface';

@Service()
export default class DesktopPrintingService {
  /**
   * Obtiene las impresoras disponibles actualmente
   * en el equipo.
   */
  getPrinters(): Promise<readonly PrinterInterface[]> {
    return window.osumiDesktop.printing.getPrinters();
  }

  /**
   * Obtiene la configuración de impresión
   * persistida para este equipo.
   */
  getSettings(): Promise<PrintingSettings> {
    return window.osumiDesktop.printing.getSettings();
  }

  /**
   * Establece la impresora utilizada para imprimir tickets.
   *
   * Un valor null deja el TPV sin impresora de tickets
   * seleccionada.
   */
  setTicketPrinterDeviceName(deviceName: string | null): Promise<PrintingSettings> {
    return window.osumiDesktop.printing.setTicketPrinterDeviceName(deviceName);
  }
}
