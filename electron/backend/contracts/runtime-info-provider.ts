import AppInfo from '@desktop-contracts/system/app-info.interface';

export interface RuntimeInfoProvider {
  getAppInfo(): AppInfo;
}
