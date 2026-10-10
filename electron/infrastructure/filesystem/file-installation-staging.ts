import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationStaging from '@backend/contracts/configuration/installation-staging.interface';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';
import { mkdir, rm } from 'node:fs/promises';

export default class FileInstallationStaging implements InstallationStaging {
  /**
   * Crea el almacenamiento temporal utilizado
   * durante una nueva instalación.
   */
  constructor(
    private readonly stagingDirectory: string,
    private readonly stagingFilesDirectory: string,
    private readonly appDataRepository: AppDataRepository,
    private readonly logoStorage: LogoStorage,
    private readonly secretStorage: SecretStorage,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  async reset(): Promise<void> {
    await rm(this.stagingDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(this.stagingDirectory, {
      recursive: true,
    });
    await mkdir(this.stagingFilesDirectory, {
      recursive: true,
    });
  }

  async prepare(
    appData: AppData,
    logo: InstallationLogoData,
    secrets: InstallationSecretsData,
  ): Promise<void> {
    await this.reset();

    try {
      /*
       * El logo y los secretos se escriben primero.
       * app_data.json se escribe el último y actúa como
       * marcador de que la preparación temporal terminó.
       */
      await this.logoStorage.save(logo);

      await this.secretStorage.save(secrets);

      await this.appDataRepository.save(appData);
    } catch (error: unknown) {
      await this.cleanAfterError();

      throw error;
    }
  }

  /**
   * Intenta limpiar best-effort el staging después
   * de fallar su preparación.
   *
   * Esta incidencia nunca sustituye al error principal
   * que provocó la limpieza.
   */
  private async cleanAfterError(): Promise<void> {
    try {
      await this.reset();
    } catch (cleanupError: unknown) {
      this.applicationLogger.warn({
        area: 'installation',
        operation: 'cleanup-installation-staging-after-error',
        message:
          'No se ha podido limpiar completamente el staging después de fallar su preparación.',
        error: cleanupError,
      });
    }
  }
}
