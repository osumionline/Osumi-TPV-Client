import type { RuntimeInfoProvider } from '@backend/contracts/runtime-info-provider';
import type { AppInfo } from '@desktop-contracts/desktop-api';
import { app } from 'electron';

export class ElectronRuntimeInfoProvider implements RuntimeInfoProvider {
  getAppInfo(): AppInfo {
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
  }
}
