import type TiposPagoService from '@backend/application/tipos-pago/tipos-pago.service';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type ReordenarTiposPagoCommand from '@desktop-contracts/configuration/tipos-pago/reordenar-tipos-pago-command.interface';
import type {
  TipoPagoEstadisticasConsulta,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
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

  ipcMain.handle(
    IPC_CHANNELS.tiposPagoGetEstadisticas,

    async (
      event,
      consulta: TipoPagoEstadisticasConsulta,
    ): Promise<TipoPagoEstadisticasResultado> => {
      assertTrustedSender(event, getMainWindow);

      return tiposPagoService.getEstadisticas(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.tiposPagoCreate,

    async (event, command: CrearTipoPagoCommand): Promise<TipoPagoInterface> => {
      assertTrustedSender(event, getMainWindow);

      return tiposPagoService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.tiposPagoUpdate,

    async (event, id: number, command: ActualizarTipoPagoCommand): Promise<TipoPagoInterface> => {
      assertTrustedSender(event, getMainWindow);

      return tiposPagoService.update(id, command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.tiposPagoReorder,

    async (event, command: ReordenarTiposPagoCommand): Promise<readonly TipoPagoInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return tiposPagoService.reorder(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.tiposPagoDeactivate,

    async (event, id: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await tiposPagoService.deactivate(id);
    },
  );
}
