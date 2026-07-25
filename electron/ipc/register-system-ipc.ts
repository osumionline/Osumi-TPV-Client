import type { SystemService } from '@backend/application/system/system.service';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export function registerSystemIpc(
  getMainWindow: MainWindowProvider,
  systemService: SystemService,
): void {
  ipcMain.handle(IPC_CHANNELS.systemGetAppInfo, (event) => {
    assertTrustedSender(event, getMainWindow);

    return systemService.getAppInfo();
  });
}
