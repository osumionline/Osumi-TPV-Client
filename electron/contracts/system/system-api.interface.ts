import type AppInfo from '@desktop-contracts/system/app-info.interface';

export default interface SystemApi {
  getAppInfo(): Promise<AppInfo>;
}
