import type ApplicationStateReader from '@backend/contracts/application/application-state-reader.interface';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { DataSource, QueryRunner } from 'typeorm';

export default class ApplicationStateService implements ApplicationStateReader {
  constructor(
    private readonly databaseFile: string,

    private readonly appDataFile: string,

    private readonly dataSourceFactory: TypeOrmDataSourceFactory,

    private readonly databaseSchemaService: DatabaseSchemaService,
  ) {}

  async getState(): Promise<ApplicationStateResult> {
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
  }

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
      console.error('La base de datos de la aplicación no es válida:', error);

      return false;
    } finally {
      await this.closeDatabase(queryRunner, dataSource);
    }
  }

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
        console.error('No se ha podido liberar la conexión de comprobación:', error);
      }
    }

    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (error: unknown) {
      console.error('No se ha podido cerrar la base de datos de comprobación:', error);
    }
  }

  private async isFile(filePath: string): Promise<boolean> {
    try {
      const fileStats: Stats = await stat(filePath);

      return fileStats.isFile();
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return false;
      }

      throw new Error(`No se ha podido comprobar el archivo: ${filePath}`, {
        cause: error,
      });
    }
  }

  private isFileNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return error.code === 'ENOENT';
  }
}
