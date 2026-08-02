import type { RuntimeInfoProvider } from '@backend/contracts/runtime-info-provider';
import AppInfo from '@desktop-contracts/system/app-info.interface';

export class SystemService {
  constructor(private readonly runtimeInfoProvider: RuntimeInfoProvider) {}

  getAppInfo(): AppInfo {
    return this.runtimeInfoProvider.getAppInfo();
  }
}
