import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';

export default interface PrintingApi {
  getPrinters(): Promise<readonly PrinterInterface[]>;

  getSettings(): Promise<PrintingSettings>;

  setTicketPrinterDeviceName(deviceName: string | null): Promise<PrintingSettings>;

  renderPdf(documentHtml: string): Promise<Uint8Array>;

  printTicket(documentHtml: string): Promise<void>;
}
