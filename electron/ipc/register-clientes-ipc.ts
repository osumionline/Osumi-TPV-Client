import type ClienteFacturasService from '@backend/application/clientes/cliente-facturas.service';
import type ClientesService from '@backend/application/clientes/clientes.service';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
  ClienteFacturaVentasConsulta,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerClientesIpc(
  getMainWindow: MainWindowProvider,
  clientesService: ClientesService,
  clienteFacturasService: ClienteFacturasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.clientesGetAll,

    async (event): Promise<readonly ClienteInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.getAll();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesCreate,

    async (event, command: CrearClienteCommand): Promise<ClienteInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesUpdate,

    async (event, command: ActualizarClienteCommand): Promise<ClienteInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.update(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesDeactivate,

    async (event, publicId: string): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await clientesService.deactivate(publicId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetFacturas,

    async (event, publicId: string): Promise<readonly ClienteFacturaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return clienteFacturasService.getByClientePublicId(publicId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesCreateFacturaBorrador,

    async (
      event,
      command: CrearClienteFacturaBorradorCommand,
    ): Promise<ClienteFacturaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clienteFacturasService.createBorrador(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesUpdateFacturaBorrador,

    async (
      event,
      command: ActualizarClienteFacturaBorradorCommand,
    ): Promise<ClienteFacturaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clienteFacturasService.updateBorrador(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesDeleteFacturaBorrador,

    async (event, command: EliminarClienteFacturaBorradorCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await clienteFacturasService.deleteBorrador(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetFacturaVentas,
    async (
      event,
      consulta: ClienteFacturaVentasConsulta,
    ): Promise<readonly ClienteFacturaVentaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return clienteFacturasService.getVentas(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetFacturaVentasDisponibles,
    async (
      event,
      consulta: ClienteFacturaVentasDisponiblesConsulta,
    ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return clienteFacturasService.getVentasDisponibles(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetEstadisticas,

    async (event, publicId: string): Promise<ClienteEstadisticasInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.getEstadisticas(publicId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetEstadisticasGenerales,

    async (event, publicId: string): Promise<ClienteEstadisticasGeneralesInterface> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.getEstadisticasGenerales(publicId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clientesGetConsumoMensual,

    async (
      event,
      consulta: ClienteConsumoMensualConsulta,
    ): Promise<ClienteConsumoMensualResultado> => {
      assertTrustedSender(event, getMainWindow);

      return clientesService.getConsumoMensual(consulta);
    },
  );
}
