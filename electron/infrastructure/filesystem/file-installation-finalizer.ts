import type ApplicationPaths from '@backend/contracts/application-paths.interface';
import type InstallationFinalizer from '@backend/contracts/installation-finalizer.interface';
import { access, mkdir, rename, rm } from 'node:fs/promises';

interface FilePromotion {
  readonly source: string;
  readonly destination: string;
}

export default class FileInstallationFinalizer implements InstallationFinalizer {
  private readonly promotions: readonly FilePromotion[];

  constructor(private readonly paths: ApplicationPaths) {
    /*
     * app_data.json debe ser siempre el último.
     */
    this.promotions = [
      {
        source: this.paths.stagingDatabaseFile,
        destination: this.paths.databaseFile,
      },
      {
        source: this.paths.stagingLogoFile,
        destination: this.paths.logoFile,
      },
      {
        source: this.paths.stagingSecretsFile,
        destination: this.paths.secretsFile,
      },
      {
        source: this.paths.stagingAppDataFile,
        destination: this.paths.appDataFile,
      },
    ];
  }

  async recover(): Promise<void> {
    const installed: boolean = await this.fileExists(this.paths.appDataFile);

    if (installed) {
      /*
       * app_data.json existe. La promoción terminó
       * correctamente y solo puede quedar basura
       * temporal en staging.
       */
      await this.cleanStagingSafely();

      return;
    }

    /*
     * No existe el marcador definitivo. Cualquier
     * recurso en las carpetas finales corresponde a
     * una instalación interrumpida.
     */
    await this.cleanPartialFinalInstallation();

    await this.resetStaging();
  }

  async finalize(): Promise<void> {
    const installed: boolean = await this.fileExists(this.paths.appDataFile);

    if (installed) {
      throw new Error('La aplicación ya está instalada.');
    }

    await this.assertStagingIsComplete();

    /*
     * Elimina residuos de un intento anterior que
     * pudiera haberse interrumpido antes de crear
     * app_data.json.
     */
    await this.cleanPartialFinalInstallation();

    /*
     * Los movimientos son secuenciales. El marcador
     * app_data.json se mueve siempre el último.
     */
    for (const promotion of this.promotions) {
      await rename(promotion.source, promotion.destination);
    }

    /*
     * Después de mover app_data.json ya consideramos
     * completada la instalación. La limpieza de staging
     * no debe convertir un éxito en un error.
     */
    await this.cleanStagingSafely();
  }

  private async assertStagingIsComplete(): Promise<void> {
    const missingFiles: string[] = [];

    for (const promotion of this.promotions) {
      const exists: boolean = await this.fileExists(promotion.source);

      if (!exists) {
        missingFiles.push(promotion.source);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(
        [
          'La instalación temporal está incompleta.',
          ...missingFiles.map((filePath: string): string => `Falta el archivo: ${filePath}`),
        ].join('\n'),
      );
    }
  }

  private async cleanPartialFinalInstallation(): Promise<void> {
    const files: readonly string[] = [
      this.paths.databaseFile,
      `${this.paths.databaseFile}-wal`,
      `${this.paths.databaseFile}-shm`,

      this.paths.logoFile,
      this.paths.secretsFile,

      `${this.paths.appDataFile}.tmp`,
      `${this.paths.logoFile}.tmp`,
      `${this.paths.secretsFile}.tmp`,
    ];

    await Promise.all(
      files.map((filePath: string): Promise<void> =>
        rm(filePath, {
          force: true,
        }),
      ),
    );
  }

  private async resetStaging(): Promise<void> {
    await rm(this.paths.stagingDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(this.paths.stagingDirectory, {
      recursive: true,
    });
  }

  private async cleanStagingSafely(): Promise<void> {
    try {
      await this.resetStaging();
    } catch (error: unknown) {
      /*
       * Si app_data.json ya está en su ubicación final,
       * la instalación está completa. Un fallo limpiando
       * staging no debe revertir el resultado.
       */
      console.error('No se ha podido limpiar staging:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);

      return true;
    } catch {
      return false;
    }
  }
}
