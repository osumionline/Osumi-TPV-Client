import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

export default interface ConfigurationApi {
  getAppData(): Promise<AppData | null>;
  install(command: InstallationCommand): Promise<InstallationResult>;
}
