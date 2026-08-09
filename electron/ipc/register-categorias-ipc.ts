import type CategoriasService from '@backend/application/categorias/categorias.service';
import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerCategoriasIpc(
  getMainWindow: MainWindowProvider,
  categoriasService: CategoriasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.categoriasGetAll,
    async (event): Promise<readonly CategoriaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return categoriasService.getAll();
    },
  );
}
