import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra la superficie IPC exclusiva
 * de la ventana imprimible de Informes.
 */
export default function registerCajaInformePrintIpc(printWindow: CajaInformePrintWindow): void {
  ipcMain.handle(
    IPC_CHANNELS.cajaInformePrintGetDocumento,

    async (event): Promise<CajaInformePrintDocumento> => printWindow.getDocumento(event.sender.id),
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaInformePrintPrint,

    async (event): Promise<void> => {
      await printWindow.print(event.sender.id);
    },
  );
}
