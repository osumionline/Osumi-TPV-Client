import type PedidosService from '@backend/application/compras/pedidos/pedidos.service';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type {
  PedidoFilterOptionsInterface,
  PedidoListadoConsulta,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de Compras expuestos al renderer.
 */
export default function registerComprasIpc(
  getMainWindow: MainWindowProvider,
  pedidosService: PedidosService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.comprasSearchPedidosGuardados,
    async (event, consulta: PedidoListadoConsulta): Promise<PedidosGuardadosResultado> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.searchPedidosGuardados(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasSearchPedidosRecepcionados,
    async (event, consulta: PedidoListadoConsulta): Promise<PedidosRecepcionadosResultado> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.searchPedidosRecepcionados(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasGetPedidoFilterOptions,
    async (event): Promise<PedidoFilterOptionsInterface> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedidoFilterOptions();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasGetPedido,
    async (event, idPedido: number): Promise<PedidoCabeceraInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedido(idPedido);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasGetPedidoFormOptions,
    async (event): Promise<PedidoFormOptionsInterface> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedidoFormOptions();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasSavePedido,
    async (event, command: PedidoSaveCommand): Promise<number> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.savePedido(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasDeletePedido,
    async (event, idPedido: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.deletePedido(idPedido);
    },
  );
}
