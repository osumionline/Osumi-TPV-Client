import { contextBridge, ipcRenderer } from 'electron';
import type { AppInfo, OsumiDesktopApi } from './contracts/desktop-api';
import { IPC_CHANNELS } from './ipc/channels';

const desktopApi: OsumiDesktopApi = Object.freeze({
  isElectron: true,

  system: Object.freeze({
    getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.systemGetAppInfo) as Promise<AppInfo>,
  }),
});

contextBridge.exposeInMainWorld('osumiDesktop', desktopApi);
