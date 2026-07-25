import { contextBridge, ipcRenderer } from 'electron';

import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';

import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

import type { AppInfo, OsumiDesktopApi } from '@desktop-contracts/desktop-api';

import IPC_CHANNELS from '@ipc/channels';

const desktopApi: OsumiDesktopApi = Object.freeze({
  isElectron: true,

  system: Object.freeze({
    getAppInfo: (): Promise<AppInfo> =>
      ipcRenderer.invoke(IPC_CHANNELS.systemGetAppInfo) as Promise<AppInfo>,
  }),

  configuration: Object.freeze({
    isConfigured: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationIsConfigured) as Promise<boolean>,

    install: (command: InstallationCommand): Promise<InstallationResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationInstall, command) as Promise<InstallationResult>,
  }),
});

contextBridge.exposeInMainWorld('osumiDesktop', desktopApi);
