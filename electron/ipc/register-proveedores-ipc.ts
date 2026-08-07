import type ProveedoresService from '@backend/application/proveedores/proveedores.service';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerProveedoresIpc(
  getMainWindow: MainWindowProvider,

  proveedoresService: ProveedoresService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.proveedoresGetAll,

    async (event): Promise<readonly ProveedorInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return proveedoresService.getAll();
    },
  );
}
