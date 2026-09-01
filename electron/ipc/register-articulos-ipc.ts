import type ArticulosService from '@backend/application/articulos/articulos.service';
import type ArticuloAccesoDirectoCommand from '@desktop-contracts/articulos/articulo-acceso-directo-command.interface';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de Artículos expuestos al renderer.
 */
export default function registerArticulosIpc(
  getMainWindow: MainWindowProvider,
  articulosService: ArticulosService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.articulosGetById,
    async (event, idArticulo: number): Promise<ArticuloInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return articulosService.getById(idArticulo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.articulosResolveByCode,
    async (event, codigo: string): Promise<ArticuloInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return articulosService.resolveByCode(codigo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.articulosGetAccesosDirectos,
    async (event): Promise<readonly ArticuloAccesoDirectoInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return articulosService.getAccesosDirectos();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.articulosSetAccesoDirecto,
    async (event, command: ArticuloAccesoDirectoCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await articulosService.setAccesoDirecto(command);
    },
  );
}
