import type ImprentaPrintWindow from '@backend/contracts/almacen/imprenta-print-window.interface';
import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra la superficie IPC exclusiva
 * de la ventana de Imprenta.
 */
export default function registerImprentaPrintIpc(printWindow: ImprentaPrintWindow): void {
  ipcMain.handle(
    IPC_CHANNELS.imprentaPrintGetDocumento,
    async (event): Promise<ImprentaPrintDocumentoInterface> =>
      printWindow.getDocumento(event.sender.id),
  );

  ipcMain.handle(IPC_CHANNELS.imprentaPrintPrint, async (event): Promise<void> => {
    await printWindow.print(event.sender.id);
  });
}
