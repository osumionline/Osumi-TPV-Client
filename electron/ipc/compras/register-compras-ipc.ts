import type PedidoArchivosService from '@backend/application/compras/pedidos/pedido-archivos.service';
import type PedidosService from '@backend/application/compras/pedidos/pedidos.service';
import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
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
  pedidoArchivosService: PedidoArchivosService,
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
    IPC_CHANNELS.comprasGetPedidoLineas,
    async (event, idPedido: number): Promise<readonly PedidoLineaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedidoLineas(idPedido);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasGetPedidoArchivos,
    async (event, idPedido: number): Promise<readonly PedidoArchivoInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedidoArchivos(idPedido);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasAttachPedidoPdf,
    async (event, idPedido: number): Promise<PedidoArchivoInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return pedidoArchivosService.attachPdf(idPedido);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasOpenPedidoPdf,
    async (event, idPedido: number, idPedidoArchivo: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await pedidoArchivosService.openPdf(idPedido, idPedidoArchivo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasDeletePedidoPdf,
    async (event, idPedido: number, idPedidoArchivo: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await pedidoArchivosService.deletePdf(idPedido, idPedidoArchivo);
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

  ipcMain.handle(
    IPC_CHANNELS.comprasRecepcionarPedido,
    async (event, idPedido: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await pedidosService.recepcionarPedido(idPedido);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasGetPedidoArticuloById,
    async (event, idArticulo: number): Promise<PedidoArticuloInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.getPedidoArticuloById(idArticulo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasResolvePedidoArticulo,
    async (event, codigo: string): Promise<PedidoArticuloInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.resolvePedidoArticulo(codigo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.comprasSearchPedidoArticulos,
    async (event, texto: string): Promise<readonly PedidoArticuloInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return pedidosService.searchPedidoArticulos(texto);
    },
  );
}
