import type AlmacenService from '@backend/application/almacen/almacen.service';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de Almacén expuestos al renderer.
 */
export default function registerAlmacenIpc(
  getMainWindow: MainWindowProvider,
  almacenService: AlmacenService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.almacenSearchInventario,
    async (event, consulta: InventarioConsulta): Promise<InventarioResultado> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.searchInventario(consulta);
    },
  );
}
