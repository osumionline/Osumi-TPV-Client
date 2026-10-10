import type ApplicationStateReader from '@backend/contracts/application/application-state-reader.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { DataSource, QueryRunner } from 'typeorm';

export default class ApplicationStateService implements ApplicationStateReader {
  /**
   * Crea el servicio encargado de determinar
   * el estado técnico actual de la instalación.
   */
  constructor(
    private readonly databaseFile: string,
    private readonly appDataFile: string,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
    private readonly databaseSchemaService: DatabaseSchemaService,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Determina si la aplicación está sin instalar,
   * incompleta, inválida o lista para trabajar.
   */
  async getState(): Promise<ApplicationStateResult> {
    try {
      const databaseExists: boolean = await this.isFile(this.databaseFile);

      const appDataExists: boolean = await this.isFile(this.appDataFile);

      if (!databaseExists) {
        if (appDataExists) {
          return {
            state: 'incomplete',
            reason: 'orphaned-configuration',
          };
        }

        return {
          state: 'not-installed',
          reason: 'database-not-found',
        };
      }

      if (!appDataExists) {
        return {
          state: 'incomplete',
          reason: 'configuration-not-found',
        };
      }

      const databaseIsValid: boolean = await this.validateDatabase();

      if (!databaseIsValid) {
        return {
          state: 'invalid',
          reason: 'database-invalid',
        };
      }

      return {
        state: 'ready',
        reason: 'ready',
      };
    } catch (error: unknown) {
      this.applicationLogger.error({
        area: 'application',
        operation: 'load-application-state',
        message: 'No se ha podido determinar el estado de la aplicación.',
        error,
      });

      throw error;
    }
  }

  /**
   * Comprueba que la base de datos instalada puede
   * abrirse y corresponde al esquema esperado.
   *
   * Una base de datos inválida forma parte del estado
   * retornado, pero conserva además el diagnóstico técnico.
   */
  private async validateDatabase(): Promise<boolean> {
    const dataSource: DataSource = this.dataSourceFactory.create(this.databaseFile);

    let queryRunner: QueryRunner | null = null;

    try {
      await dataSource.initialize();

      queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();

      await this.databaseSchemaService.validate(queryRunner);

      return true;
    } catch (error: unknown) {
      this.applicationLogger.error({
        area: 'database',
        operation: 'validate-application-database',
        message: 'La base de datos de la aplicación no ha superado la validación.',
        error,
      });

      return false;
    } finally {
      await this.closeDatabase(queryRunner, dataSource);
    }
  }

  /**
   * Libera best-effort todos los recursos utilizados
   * exclusivamente durante la comprobación de estado.
   */
  private async closeDatabase(
    queryRunner: QueryRunner | null,
    dataSource: DataSource,
  ): Promise<void> {
    if (queryRunner !== null) {
      try {
        if (!queryRunner.isReleased) {
          await queryRunner.release();
        }
      } catch (error: unknown) {
        this.applicationLogger.warn({
          area: 'database',
          operation: 'release-validation-connection',
          message: 'No se ha podido liberar la conexión temporal de validación.',
          error,
        });
      }
    }

    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'database',
        operation: 'disconnect-validation-database',
        message: 'No se ha podido cerrar la base de datos temporal de validación.',
        error,
      });
    }
  }

  /**
   * Comprueba si una ruta corresponde a un fichero.
   *
   * La ruta concreta no se incorpora al mensaje de error
   * para evitar persistir información local innecesaria.
   */
  private async isFile(filePath: string): Promise<boolean> {
    try {
      const fileStats: Stats = await stat(filePath);

      return fileStats.isFile();
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return false;
      }

      throw new Error('No se ha podido comprobar un archivo requerido por la aplicación.', {
        cause: error,
      });
    }
  }

  /**
   * Comprueba si el filesystem indica
   * que el fichero solicitado no existe.
   */
  private isFileNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return error.code === 'ENOENT';
  }
}
