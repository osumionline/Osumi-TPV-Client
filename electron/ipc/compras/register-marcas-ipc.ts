import type MarcasService from '@backend/application/marcas/marcas.service';
import type ActualizarMarcaCommand from '@desktop-contracts/compras/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/compras/marcas/crear-marca-command.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/compras/marcas/marca-estadisticas.interface';
import type MarcaInterface from '@desktop-contracts/compras/marcas/marca.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerMarcasIpc(
  getMainWindow: MainWindowProvider,
  marcasService: MarcasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.marcasGetAll,

    async (event): Promise<readonly MarcaInterface[]> => {
      assertTrustedSender(event, getMainWindow);
      return marcasService.getAll();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.marcasGetById,
    async (event, id: number): Promise<MarcaInterface | null> => {
      assertTrustedSender(event, getMainWindow);

      return marcasService.getById(id);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.marcasGetEstadisticas,
    async (event, consulta: MarcaEstadisticasConsulta): Promise<MarcaEstadisticasResultado> => {
      assertTrustedSender(event, getMainWindow);

      return marcasService.getEstadisticas(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.marcasCreate,
    async (event, command: CrearMarcaCommand): Promise<MarcaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return marcasService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.marcasUpdate,
    async (event, id: number, command: ActualizarMarcaCommand): Promise<MarcaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return marcasService.update(id, command);
    },
  );

  ipcMain.handle(IPC_CHANNELS.marcasDeactivate, async (event, id: number): Promise<void> => {
    assertTrustedSender(event, getMainWindow);

    await marcasService.deactivate(id);
  });
}
