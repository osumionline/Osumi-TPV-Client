import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';

export type MainWindowProvider = () => BrowserWindow | null;

export function assertTrustedSender(
  event: IpcMainInvokeEvent,
  getMainWindow: MainWindowProvider,
): void {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);

  const mainWindow = getMainWindow();

  if (sourceWindow === null || sourceWindow !== mainWindow) {
    throw new Error('IPC request received from an unauthorized window.');
  }
}
