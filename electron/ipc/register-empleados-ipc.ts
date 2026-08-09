import type EmpleadosService from '@backend/application/empleados/empleados.service';
import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerEmpleadosIpc(
  getMainWindow: MainWindowProvider,
  empleadosService: EmpleadosService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.empleadosGetAll,

    async (event): Promise<readonly EmpleadoInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return empleadosService.getAll();
    },
  );
}
