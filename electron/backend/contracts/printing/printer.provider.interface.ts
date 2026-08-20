import type PrinterInterface from '@desktop-contracts/printing/printer.interface';

export default interface PrinterProvider {
  getPrinters(): Promise<readonly PrinterInterface[]>;
}
