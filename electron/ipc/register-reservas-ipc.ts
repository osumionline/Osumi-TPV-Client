import type ReservasService from '@backend/application/reservas/reservas.service';
import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los canales IPC del dominio Reservas.
 */
export default function registerReservasIpc(
  getMainWindow: MainWindowProvider,
  reservasService: ReservasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.reservasCreate,
    async (event, command: CrearReservaCommand): Promise<string> => {
      assertTrustedSender(event, getMainWindow);

      return reservasService.create(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.reservasGetAll,
    async (event): Promise<readonly ReservaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return reservasService.getAll();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.reservasDeleteLinea,
    async (event, publicId: string): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await reservasService.deleteLinea(publicId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.reservasDelete, async (event, publicId: string): Promise<void> => {
    assertTrustedSender(event, getMainWindow);

    await reservasService.deleteReserva(publicId);
  });
}
