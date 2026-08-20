import type PrintingService from '@backend/application/printing/printing.service';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerPrintingIpc(
  getMainWindow: MainWindowProvider,
  printingService: PrintingService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.printingGetPrinters,
    async (event): Promise<readonly PrinterInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return printingService.getPrinters();
    },
  );

  ipcMain.handle(IPC_CHANNELS.printingGetSettings, async (event): Promise<PrintingSettings> => {
    assertTrustedSender(event, getMainWindow);

    return printingService.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.printingSetTicketPrinter,
    async (event, deviceName: unknown): Promise<PrintingSettings> => {
      assertTrustedSender(event, getMainWindow);

      return printingService.setTicketPrinterDeviceName(deviceName);
    },
  );
}
