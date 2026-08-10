import { Service } from '@angular/core';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

@Service()
export default class DesktopConfigurationService {
  install(command: InstallationCommand): Promise<InstallationResult> {
    return window.osumiDesktop.configuration.install(command);
  }
}
