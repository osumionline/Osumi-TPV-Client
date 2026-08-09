import type InstallationDatabase from '@backend/contracts/configuration/installation-database.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type { DatabaseCreationOptions } from '@backend/domain/database/database-creation-options.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import NewInstallationDataService from '@infrastructure/database/initial-data/new-installation-data.service';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { rm } from 'node:fs/promises';
import type { DataSource, QueryRunner } from 'typeorm';

export default class TypeOrmInstallationDatabase implements InstallationDatabase {
  constructor(
    private readonly databaseFile: string,
    private readonly applicationVersion: string,
    private readonly passwordHasher: PasswordHasher,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
    private readonly databaseSchemaService: DatabaseSchemaService,
    private readonly newInstallationDataService: NewInstallationDataService,
  ) {}

  async prepare(command: InstallationCommand): Promise<void> {
    await this.delete();

    const createdAt: string = new Date().toISOString();

    const passwordHash: string = await this.passwordHasher.hash(command.empleadoInicial.password);

    const creationOptions: DatabaseCreationOptions = {
      applicationVersion: this.applicationVersion,
      installationType: 'new',
      createdAt,
      importedAt: null,
    };

    const dataSource: DataSource = this.dataSourceFactory.create(this.databaseFile);

    let queryRunner: QueryRunner | null = null;

    try {
      await dataSource.initialize();

      queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();

      await this.databaseSchemaService.create(queryRunner, creationOptions);

      await this.newInstallationDataService.create(queryRunner, command, passwordHash, createdAt);

      /*
       * Volvemos a validar después de insertar los
       * datos iniciales para comprobar también las
       * claves foráneas creadas por esos registros.
       */
      await this.databaseSchemaService.validate(queryRunner);

      await this.checkpointDatabase(queryRunner);

      await this.closeDatabase(queryRunner, dataSource);

      queryRunner = null;

      await this.deleteAuxiliaryFiles();
    } catch (error: unknown) {
      await this.closeDatabaseSafely(queryRunner, dataSource);

      await this.delete();

      throw error;
    }
  }

  async delete(): Promise<void> {
    const databaseFiles: readonly string[] = [
      this.databaseFile,
      `${this.databaseFile}-wal`,
      `${this.databaseFile}-shm`,
    ];

    await Promise.all(
      databaseFiles.map((filePath: string): Promise<void> =>
        rm(filePath, {
          force: true,
        }),
      ),
    );
  }

  private async checkpointDatabase(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  private async deleteAuxiliaryFiles(): Promise<void> {
    const auxiliaryFiles: readonly string[] = [
      `${this.databaseFile}-wal`,
      `${this.databaseFile}-shm`,
    ];

    await Promise.all(
      auxiliaryFiles.map((filePath: string): Promise<void> =>
        rm(filePath, {
          force: true,
        }),
      ),
    );
  }

  private async closeDatabase(queryRunner: QueryRunner, dataSource: DataSource): Promise<void> {
    if (!queryRunner.isReleased) {
      await queryRunner.release();
    }

    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  private async closeDatabaseSafely(
    queryRunner: QueryRunner | null,
    dataSource: DataSource,
  ): Promise<void> {
    try {
      if (queryRunner !== null && !queryRunner.isReleased) {
        await queryRunner.release();
      }
    } catch (error: unknown) {
      console.error('No se ha podido liberar el QueryRunner:', error);
    }

    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (error: unknown) {
      console.error('No se ha podido cerrar la conexión SQLite:', error);
    }
  }
}
