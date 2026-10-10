import type ConfigurationService from '@backend/application/configuration/configuration.service';
import createAppData from '@backend/application/configuration/installation-app-data.mapper';
import {
  isInstallationCommand,
  validateInstallationCommand,
} from '@backend/application/configuration/installation-command.validator';
import type InstallationDatabase from '@backend/contracts/configuration/installation-database.interface';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type InstallationStaging from '@backend/contracts/configuration/installation-staging.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type {
  InstallationResult,
  InstallationValidationError,
} from '@desktop-contracts/configuration/installation-result.interface';

export default class InstallationService {
  /**
   * Crea el servicio responsable de una nueva instalación.
   */
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly staging: InstallationStaging,
    private readonly installationDatabase: InstallationDatabase,
    private readonly installationFinalizer: InstallationFinalizer,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  async install(value: unknown): Promise<InstallationResult> {
    if (!isInstallationCommand(value)) {
      const validationError: InstallationValidationError = {
        field: 'command',
        message: 'El comando de instalación no tiene una estructura válida.',
      };

      return {
        status: 'error',
        message: 'Los datos de instalación recibidos no son válidos.',
        validationErrors: [validationError],
      };
    }

    const validationErrors: InstallationValidationError[] = validateInstallationCommand(value);

    if (validationErrors.length > 0) {
      return {
        status: 'error',
        message: 'Algunos datos de instalación no son válidos.',
        validationErrors,
      };
    }

    try {
      const configured: boolean = await this.configurationService.isConfigured();

      if (configured) {
        return {
          status: 'error',
          message: 'La aplicación ya está configurada.',
          validationErrors: [
            {
              field: 'installation',
              message:
                'No se puede iniciar una nueva instalación porque la aplicación ya está configurada.',
            },
          ],
        };
      }

      const command: InstallationCommand = value;
      const installedAt: string = new Date().toISOString();
      const appData: AppData = createAppData(command, installedAt);

      await this.staging.prepare(appData, command.logo, command.secretos);
      await this.installationDatabase.prepare(command);
      await this.installationFinalizer.finalize();

      return {
        status: 'installed',
        message: 'La aplicación se ha instalado correctamente.',
        validationErrors: [],
      };
    } catch (error: unknown) {
      this.applicationLogger.error({
        area: 'installation',
        operation: 'install',
        message: 'No se ha podido completar la instalación de la aplicación.',
        error,
      });

      try {
        await this.installationFinalizer.recover();
      } catch (recoveryError: unknown) {
        this.applicationLogger.warn({
          area: 'installation',
          operation: 'recover-incomplete-installation',
          message: 'No se ha podido recuperar completamente una instalación fallida.',
          error: recoveryError,
        });
      }

      return {
        status: 'error',
        message: 'No se ha podido completar la instalación.',
        validationErrors: [],
      };
    }
  }
}
