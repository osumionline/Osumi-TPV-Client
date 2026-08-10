import type VentasArticulosService from '@backend/application/ventas/ventas-articulos.service';
import type VentasContextService from '@backend/application/ventas/ventas-context.service';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
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
  ventasArticulosService: VentasArticulosService,
): void {
  ipcMain.handle(IPC_CHANNELS.ventasGetContext, async (event): Promise<VentasContextInterface> => {
    assertTrustedSender(event, getMainWindow);

    return ventasContextService.get();
  });

  ipcMain.handle(
    IPC_CHANNELS.ventasResolveArticulo,
    async (event, codigo: string): Promise<ArticuloVentaInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return ventasArticulosService.resolveArticulo(codigo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasSearchArticulos,
    async (event, query: string): Promise<readonly ArticuloVentaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return ventasArticulosService.searchArticulos(query);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasGetAccesosDirectos,
    async (event): Promise<readonly AccesoDirectoVentaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return ventasArticulosService.getAccesosDirectos();
    },
  );
}
