import type MarcasService from '@backend/application/marcas/marcas.service';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerMarcasIpc(
  getMainWindow: MainWindowProvider,
  marcasService: MarcasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.marcasGetAll,

    async (event): Promise<readonly MarcaInterface[]> => {
      assertTrustedSender(event, getMainWindow);
      return marcasService.getAll();
    },
  );
}
