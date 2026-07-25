import type { AppInfo } from '@desktop-contracts/desktop-api';

export interface RuntimeInfoProvider {
  getAppInfo(): AppInfo;
}
