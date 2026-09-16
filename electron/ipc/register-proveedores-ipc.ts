import type ProveedoresService from '@backend/application/proveedores/proveedores.service';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
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

  ipcMain.handle(
    IPC_CHANNELS.proveedoresGetById,
    async (event, id: number): Promise<ProveedorInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return proveedoresService.getById(id);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.proveedoresCreate,
    async (event, command: CrearProveedorCommand): Promise<ProveedorInterface> => {
      assertTrustedSender(event, getMainWindow);

      return proveedoresService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.proveedoresUpdate,
    async (event, id: number, command: ActualizarProveedorCommand): Promise<ProveedorInterface> => {
      assertTrustedSender(event, getMainWindow);

      return proveedoresService.update(id, command);
    },
  );

  ipcMain.handle(IPC_CHANNELS.proveedoresDeactivate, async (event, id: number): Promise<void> => {
    assertTrustedSender(event, getMainWindow);

    await proveedoresService.deactivate(id);
  });
}
