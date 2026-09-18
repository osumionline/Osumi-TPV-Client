import type TiposPagoService from '@backend/application/tipos-pago/tipos-pago.service';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerTiposPagoIpc(
  getMainWindow: MainWindowProvider,
  tiposPagoService: TiposPagoService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.tiposPagoGetAll,

    async (event): Promise<readonly TipoPagoInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return tiposPagoService.getAll();
    },
  );
}
