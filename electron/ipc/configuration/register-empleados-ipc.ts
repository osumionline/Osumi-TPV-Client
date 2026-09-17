import type EmpleadosService from '@backend/application/empleados/empleados.service';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
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

  ipcMain.handle(
    IPC_CHANNELS.empleadosCreate,

    async (event, command: CrearEmpleadoCommand): Promise<EmpleadoInterface> => {
      assertTrustedSender(event, getMainWindow);

      return empleadosService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.empleadosUpdate,

    async (
      event,
      idEmpleado: number,
      command: ActualizarEmpleadoCommand,
    ): Promise<EmpleadoInterface> => {
      assertTrustedSender(event, getMainWindow);

      return empleadosService.update(idEmpleado, command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.empleadosDeactivate,

    async (event, idEmpleado: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      return empleadosService.deactivate(idEmpleado);
    },
  );
}
