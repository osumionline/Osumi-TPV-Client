import { validateOtpvV3PortableSecrets } from '@backend/application/backup/otpv-v3-contract.validator';
import type OtpvV3PortableSecrets from '@backend/contracts/backup/otpv-v3-portable-secrets.interface';
import type OtpvV3RestoreStagingPreparer from '@backend/contracts/backup/otpv-v3-restore-staging-preparer.interface';
import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';

/**
 * Transforma un restore-work v3 ya validado
 * en el staging canónico de instalación.
 */
export default class FileOtpvV3RestoreStagingPreparer implements OtpvV3RestoreStagingPreparer {
  /**
   * Crea el preparador sobre las rutas y el
   * SecretStorage de staging de la máquina destino.
   */
  constructor(
    private readonly paths: ApplicationPaths,
    private readonly secretStorage: SecretStorage,
  ) {}

  /**
   * Elimina cualquier staging canónico
   * preparado por una restauración anterior.
   */
  async clear(): Promise<void> {
    await this.cleanCanonicalStaging();
  }

  /**
   * Reconstruye los secretos locales y mueve
   * los recursos portables al staging canónico.
   */
  async prepare(workspace: OtpvV3RestoreWorkspace, backupApiKey: string): Promise<void> {
    try {
      if (backupApiKey.length === 0) {
        throw new Error('La TPV Backup key no puede estar vacía al preparar la restauración.');
      }

      const portableSecrets: OtpvV3PortableSecrets = await this.readPortableSecrets(
        workspace.portableSecretsFile,
      );

      const installationSecrets: InstallationSecretsData = {
        secretApi: portableSecrets.secretApi,

        /*
         * Debe conservarse exactamente la clave
         * utilizada para abrir la copia.
         */
        backupApiKey,

        emailSmtpPass: portableSecrets.emailSmtpPass,

        ticketBaiToken: portableSecrets.ticketBaiToken,
      };

      await this.cleanCanonicalStaging();

      await mkdir(this.paths.stagingDirectory, {
        recursive: true,
      });

      /*
       * Los secretos se reconstruyen mediante
       * safeStorage en la máquina destino.
       */
      await this.secretStorage.save(installationSecrets);

      /*
       * Los movimientos se realizan únicamente
       * después de superar todas las validaciones.
       */
      await rename(workspace.databaseFile, this.paths.stagingDatabaseFile);

      await rename(workspace.filesDirectory, this.paths.stagingFilesDirectory);

      await rename(workspace.logoFile, this.paths.stagingLogoFile);

      /*
       * app_data.json es el último recurso.
       * Su presencia indica staging completo.
       */
      await rename(workspace.appDataFile, this.paths.stagingAppDataFile);

      /*
       * Ya no necesitamos los secretos portables
       * ni ningún resto de restore-work.
       */
      await workspace.clear();
    } catch (error: unknown) {
      await this.cleanAfterError(workspace);

      throw error;
    }
  }

  /**
   * Lee y vuelve a validar los secretos portables
   * inmediatamente antes de utilizarlos.
   */
  private async readPortableSecrets(secretsFile: string): Promise<OtpvV3PortableSecrets> {
    const content: Buffer = await readFile(secretsFile);

    try {
      let parsed: unknown;

      try {
        parsed = JSON.parse(content.toString('utf8')) as unknown;
      } catch (error: unknown) {
        throw new Error('secrets/secrets.json no contiene JSON válido.', {
          cause: error,
        });
      }

      return validateOtpvV3PortableSecrets(parsed);
    } finally {
      content.fill(0);
    }
  }

  /**
   * Elimina exclusivamente los destinos canónicos
   * de staging sin tocar restore-work.
   */
  private async cleanCanonicalStaging(): Promise<void> {
    const targets: readonly string[] = [
      this.paths.stagingDatabaseFile,
      `${this.paths.stagingDatabaseFile}-wal`,
      `${this.paths.stagingDatabaseFile}-shm`,

      this.paths.stagingFilesDirectory,

      this.paths.stagingLogoFile,
      `${this.paths.stagingLogoFile}.tmp`,

      this.paths.stagingSecretsFile,
      `${this.paths.stagingSecretsFile}.tmp`,

      this.paths.stagingAppDataFile,
      `${this.paths.stagingAppDataFile}.tmp`,
    ];

    await Promise.all(
      targets.map((target: string): Promise<void> =>
        rm(target, {
          recursive: true,
          force: true,
        }),
      ),
    );
  }

  /**
   * Limpia tanto el staging canónico como
   * restore-work después de un error.
   */
  private async cleanAfterError(workspace: OtpvV3RestoreWorkspace): Promise<void> {
    await Promise.all([this.cleanCanonicalStagingSafely(), this.clearWorkspaceSafely(workspace)]);
  }

  /**
   * Limpia staging sin ocultar el error original.
   */
  private async cleanCanonicalStagingSafely(): Promise<void> {
    try {
      await this.cleanCanonicalStaging();
    } catch (error: unknown) {
      console.error('No se ha podido limpiar el staging parcial de restauración:', error);
    }
  }

  /**
   * Limpia restore-work sin ocultar
   * el error original.
   */
  private async clearWorkspaceSafely(workspace: OtpvV3RestoreWorkspace): Promise<void> {
    try {
      await workspace.clear();
    } catch (error: unknown) {
      console.error('No se ha podido limpiar restore-work después de un error:', error);
    }
  }
}
