import type { RuntimeInfoProvider } from '@backend/contracts/runtime-info-provider';
import type { AppInfo } from '@desktop-contracts/desktop-api';

export class SystemService {
  constructor(private readonly runtimeInfoProvider: RuntimeInfoProvider) {}

  getAppInfo(): AppInfo {
    return this.runtimeInfoProvider.getAppInfo();
  }
}
