import type ClienteFacturasService from '@backend/application/clientes/cliente-facturas.service';
import type ClientesService from '@backend/application/clientes/clientes.service';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
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
