import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';

import type { AppInfo } from '../contracts/desktop-api';
import { IPC_CHANNELS } from './channels';

type MainWindowProvider = () => BrowserWindow | null;

function assertTrustedSender(event: IpcMainInvokeEvent, getMainWindow: MainWindowProvider): void {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  const mainWindow = getMainWindow();

  if (sourceWindow === null || sourceWindow !== mainWindow) {
    throw new Error('IPC request received from an unauthorized window.');
  }
}

export function registerSystemIpc(getMainWindow: MainWindowProvider): void {
  ipcMain.handle(IPC_CHANNELS.systemGetAppInfo, (event): AppInfo => {
    assertTrustedSender(event, getMainWindow);

    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions['electron'] ?? '',
      chromeVersion: process.versions['chrome'] ?? '',
      nodeVersion: process.versions['node'] ?? '',
      isPackaged: app.isPackaged,
    };
  });
}
