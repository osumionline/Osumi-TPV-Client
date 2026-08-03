import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type { DatabaseCreationOptions } from '@backend/domain/database/database-creation-options.interface';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { rm } from 'node:fs/promises';
import type { DataSource, QueryRunner } from 'typeorm';

export default class TypeOrmLegacyImportDatabase {
  constructor(
    private readonly databaseFile: string,
    private readonly applicationVersion: string,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
    private readonly databaseSchemaService: DatabaseSchemaService,
  ) {}

  async prepare(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<void> {
    await this.delete();

    this.reportProgress(
      command,
      progressListener,
      'preparing-staging',
      10,
      'Preparando la base de datos temporal…',
    );

    const dataSource: DataSource = this.dataSourceFactory.create(this.databaseFile);

    let queryRunner: QueryRunner | null = null;

    try {
      await dataSource.initialize();

      queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();

      const creationOptions: DatabaseCreationOptions = {
        applicationVersion: this.applicationVersion,
        installationType: 'legacy_import',
        createdAt: command.startedAt,
        importedAt: command.startedAt,
      };

      this.reportProgress(
        command,
        progressListener,
        'creating-schema',
        30,
        'Creando el esquema SQLite…',
      );

      await this.databaseSchemaService.create(queryRunner, creationOptions);

      this.reportProgress(
        command,
        progressListener,
        'registering-import',
        65,
        'Registrando el origen de la importación…',
      );

      await this.insertImportRecord(queryRunner, command);

      this.reportProgress(
        command,
        progressListener,
        'validating-database',
        85,
        'Validando la base de datos temporal…',
      );

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

  private async insertImportRecord(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
  ): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `
          INSERT INTO legacy_import (
            source_application,
            source_version,
            source_schema_version,
            source_hash,
            status,
            started_at,
            completed_at,
            warning_count,
            error_count,
            report_relative_path
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            'running',
            ?,
            NULL,
            ?,
            0,
            NULL
          )
        `,
        [
          command.sourceApplication,
          command.sourceVersion,
          command.sourceSchemaVersion,
          command.sourceHash.toLowerCase(),
          command.startedAt,
          command.warningCount,
        ],
      );

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    }
  }

  private reportProgress(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
    stage: Parameters<LegacyImportProgressListener>[0]['stage'],
    percentage: number,
    message: string,
  ): void {
    progressListener({
      selectionId: command.selectionId,
      stage,
      percentage,
      message,
    });
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
      console.error('No se ha podido liberar el QueryRunner de importación:', error);
    }

    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (error: unknown) {
      console.error('No se ha podido cerrar la SQLite temporal de importación:', error);
    }
  }
}
