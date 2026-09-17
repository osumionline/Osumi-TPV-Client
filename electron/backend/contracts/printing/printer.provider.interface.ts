import type PrinterInterface from '@desktop-contracts/configuration/printing/printer.interface';

export default interface PrinterProvider {
  getPrinters(): Promise<readonly PrinterInterface[]>;
}
