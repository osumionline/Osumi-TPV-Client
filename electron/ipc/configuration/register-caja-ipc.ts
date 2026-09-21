import type CajaService from '@backend/application/caja/caja.service';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los canales IPC relacionados con las operaciones de caja.
 */
export default function registerCajaIpc(
  getMainWindow: MainWindowProvider,
  cajaService: CajaService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.cajaOpen,
    async (event, command: AbrirCajaCommand): Promise<CajaAbiertaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.open(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaGetSalidas,
    async (event, consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.findSalidas(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaCreateSalida,
    async (event, command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.createSalida(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaUpdateSalida,
    async (event, command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.updateSalida(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaDeleteSalida,
    async (event, command: EliminarSalidaCajaCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await cajaService.deleteSalida(command);
    },
  );
}
