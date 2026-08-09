import type ClientesService from '@backend/application/clientes/clientes.service';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerClientesIpc(
  getMainWindow: MainWindowProvider,
  clientesService: ClientesService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.clientesGetAll,

    async (event): Promise<readonly ClienteInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.getAll();
    },
  );
}
