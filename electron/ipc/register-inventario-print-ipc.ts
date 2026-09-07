import type InventarioPrintWindow from '@backend/contracts/almacen/inventario-print-window.interface';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra la superficie IPC exclusiva de la vista de impresión.
 */
export default function registerInventarioPrintIpc(printWindow: InventarioPrintWindow): void {
  ipcMain.handle(
    IPC_CHANNELS.inventarioPrintGetDocumento,
    async (event): Promise<InventarioPrintDocumentoInterface> =>
      printWindow.getDocumento(event.sender.id),
  );

  ipcMain.handle(IPC_CHANNELS.inventarioPrintPrint, async (event): Promise<void> => {
    await printWindow.print(event.sender.id);
  });
}
