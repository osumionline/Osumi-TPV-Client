import type { AppInfo, OsumiDesktopApi } from '@desktop-contracts/desktop-api';
import { IPC_CHANNELS } from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const desktopApi: OsumiDesktopApi = Object.freeze({
  isElectron: true,

  system: Object.freeze({
    getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.systemGetAppInfo) as Promise<AppInfo>,
  }),

  configuration: Object.freeze({
    isConfigured: () =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationIsConfigured) as Promise<boolean>,
  }),
});

contextBridge.exposeInMainWorld('osumiDesktop', desktopApi);
