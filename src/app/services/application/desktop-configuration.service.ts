import { Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import type RevealableConfigurationSecret from '@desktop-contracts/configuration/revealable-configuration-secret.type';

@Service()
export default class DesktopConfigurationService {
  /**
   * Obtiene la configuración global de la instalación.
   */
  getAppData(): Promise<AppData | null> {
    return window.osumiDesktop.configuration.getAppData();
  }

  /**
   * Obtiene bajo demanda un secreto operacional
   * cuya revelación está permitida.
   */
  revealSecret(secret: RevealableConfigurationSecret): Promise<string | null> {
    return window.osumiDesktop.configuration.revealSecret(secret);
  }

  /**
   * Ejecuta una nueva instalación.
   */
  install(command: InstallationCommand): Promise<InstallationResult> {
    return window.osumiDesktop.configuration.install(command);
  }

  /**
   * Actualiza los ajustes generales persistidos de la aplicación.
   */
  updateAppData(command: ConfigurationUpdateCommand): Promise<AppData> {
    return window.osumiDesktop.configuration.updateAppData(command);
  }
}
