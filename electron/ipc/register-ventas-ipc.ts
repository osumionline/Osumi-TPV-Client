import type VentasArticulosService from '@backend/application/ventas/ventas-articulos.service';
import type VentasContextService from '@backend/application/ventas/ventas-context.service';
import type VentasDevolucionesService from '@backend/application/ventas/ventas-devoluciones.service';
import type VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
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
  ventasDevolucionesService: VentasDevolucionesService,
  ventasPersistenciaService: VentasPersistenciaService,
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

  ipcMain.handle(
    IPC_CHANNELS.ventasGetDevolucion,
    async (event, idVenta: number): Promise<VentaDevolucionInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return ventasDevolucionesService.getByVentaId(idVenta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasSave,
    async (event, command: GuardarVentaCommand): Promise<GuardarVentaResult> => {
      assertTrustedSender(event, getMainWindow);

      return ventasPersistenciaService.save(command);
    },
  );
}
