import type VentasArticulosService from '@backend/application/ventas/ventas-articulos.service';
import type VentasContextService from '@backend/application/ventas/ventas-context.service';
import type VentasDevolucionesService from '@backend/application/ventas/ventas-devoluciones.service';
import type VentasHistoricoService from '@backend/application/ventas/ventas-historico.service';
import type VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import type VentasPostventaService from '@backend/application/ventas/ventas-postventa.service';
import type VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type {
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
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
  ventasHistoricoService: VentasHistoricoService,
  ventasPostventaService: VentasPostventaService,
  ventasPersistenciaService: VentasPersistenciaService,
  ventasTicketsService: VentasTicketsService,
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
    IPC_CHANNELS.ventasGetHistorico,
    async (event, consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado> => {
      assertTrustedSender(event, getMainWindow);

      return ventasHistoricoService.findByPeriod(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasGetHistoricoDetalle,
    async (event, idVenta: number): Promise<VentaHistoricoDetalle | null> => {
      assertTrustedSender(event, getMainWindow);

      return ventasHistoricoService.findDetalleByVentaId(idVenta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasCambiarCliente,
    async (event, command: VentaPostventaCambiarClienteCommand): Promise<VentaHistoricoDetalle> => {
      assertTrustedSender(event, getMainWindow);

      return ventasPostventaService.cambiarCliente(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasCambiarTipoPago,
    async (
      event,
      command: VentaPostventaCambiarTipoPagoCommand,
    ): Promise<VentaHistoricoDetalle> => {
      assertTrustedSender(event, getMainWindow);

      return ventasPostventaService.cambiarTipoPago(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasGetTicket,
    async (event, idVenta: number): Promise<VentaTicketInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return ventasTicketsService.getByVentaId(idVenta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ventasSaveTicketPdf,
    async (event, idVenta: number, ticketRevision: number, pdf: Uint8Array): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await ventasTicketsService.savePdf(idVenta, ticketRevision, pdf);
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
