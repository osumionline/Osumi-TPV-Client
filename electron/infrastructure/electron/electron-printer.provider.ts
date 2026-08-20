import type PrinterProvider from '@backend/contracts/printing/printer.provider.interface';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type { BrowserWindow, PrinterInfo } from 'electron';

type MainWindowProvider = () => BrowserWindow | null;

export default class ElectronPrinterProvider implements PrinterProvider {
  constructor(private readonly getMainWindow: MainWindowProvider) {}

  async getPrinters(): Promise<readonly PrinterInterface[]> {
    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      throw new Error('La ventana principal no está disponible para consultar las impresoras.');
    }

    const printers: readonly PrinterInfo[] = await mainWindow.webContents.getPrintersAsync();

    return printers
      .map((printer: PrinterInfo): PrinterInterface => ({
        deviceName: printer.name,
        displayName: printer.displayName.length > 0 ? printer.displayName : printer.name,
        description: printer.description,
      }))
      .sort((a: PrinterInterface, b: PrinterInterface): number =>
        a.displayName.localeCompare(b.displayName, 'es'),
      );
  }
}
