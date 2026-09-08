import type CaducidadReportWindow from '@backend/contracts/almacen/caducidad-report-window.interface';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidad-report.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra la superficie IPC exclusiva del informe de Caducidades.
 */
export default function registerCaducidadReportIpc(reportWindow: CaducidadReportWindow): void {
  ipcMain.handle(
    IPC_CHANNELS.caducidadReportGetDocumento,
    async (event): Promise<CaducidadReportInterface> => reportWindow.getDocumento(event.sender.id),
  );

  ipcMain.handle(IPC_CHANNELS.caducidadReportPrint, async (event): Promise<void> => {
    await reportWindow.print(event.sender.id);
  });
}
