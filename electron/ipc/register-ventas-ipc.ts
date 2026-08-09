import type VentasContextService from '@backend/application/ventas/ventas-context.service';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los canales IPC relacionados con el módulo de ventas.
 */
export default function registerVentasIpc(
  getMainWindow: MainWindowProvider,
  ventasContextService: VentasContextService,
): void {
  ipcMain.handle(IPC_CHANNELS.ventasGetContext, async (event): Promise<VentasContextInterface> => {
    assertTrustedSender(event, getMainWindow);

    return ventasContextService.get();
  });
}
