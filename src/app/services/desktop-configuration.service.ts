import { Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

@Service()
export default class DesktopConfigurationService {
  /**
   * Obtiene la configuración global de la instalación.
   */
  getAppData(): Promise<AppData | null> {
    return window.osumiDesktop.configuration.getAppData();
  }

  /**
   * Ejecuta una nueva instalación.
   */
  install(command: InstallationCommand): Promise<InstallationResult> {
    return window.osumiDesktop.configuration.install(command);
  }
}
