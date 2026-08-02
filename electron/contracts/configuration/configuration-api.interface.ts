import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

export default interface ConfigurationApi {
  install(command: InstallationCommand): Promise<InstallationResult>;
}
