import type EmpleadosService from '@backend/application/empleados/empleados.service';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
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

  ipcMain.handle(
    IPC_CHANNELS.empleadosAuthenticate,

    async (event, command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult> => {
      assertTrustedSender(event, getMainWindow);

      return empleadosService.authenticate(command);
    },
  );
}
