import type ApplicationStateReader from '@backend/contracts/application-state-reader.interface';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import ipcChannels from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerApplicationIpc(
  applicationStateReader: ApplicationStateReader,
): void {
  ipcMain.handle(
    ipcChannels.applicationGetState,

    async (): Promise<ApplicationStateResult> => applicationStateReader.getState(),
  );
}
