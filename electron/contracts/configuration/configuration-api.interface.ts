import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import type RevealableConfigurationSecret from '@desktop-contracts/configuration/revealable-configuration-secret.type';

export default interface ConfigurationApi {
  /**
   * Obtiene la configuración pública de la instalación.
   */
  getAppData(): Promise<AppData | null>;

  /**
   * Obtiene bajo demanda un secreto operacional
   * cuya revelación está expresamente permitida.
   */
  revealSecret(secret: RevealableConfigurationSecret): Promise<string | null>;

  /**
   * Actualiza los ajustes persistidos de la instalación.
   */
  updateAppData(command: ConfigurationUpdateCommand): Promise<AppData>;

  /**
   * Ejecuta una nueva instalación de Osumi TPV.
   */
  install(command: InstallationCommand): Promise<InstallationResult>;
}
