import type CajaService from '@backend/application/caja/caja.service';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
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
}
