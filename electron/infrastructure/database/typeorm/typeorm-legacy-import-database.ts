import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import/legacy-import-progress-listener.type';
import type { DatabaseCreationOptions } from '@backend/domain/database/database-creation-options.interface';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportExecutionSummary from '@backend/domain/legacy-import/legacy-import-execution-summary.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { rm } from 'node:fs/promises';
import type { DataSource, QueryRunner } from 'typeorm';

interface MaximumDocumentNumberRow {
  readonly maximumNumber: number;
}

type DocumentSequenceType = 'venta' | 'factura';

type DocumentSourceTable = 'venta' | 'factura';

export default class TypeOrmLegacyImportDatabase {
  constructor(
    private readonly databaseFile: string,
    private readonly applicationVersion: string,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
    private readonly databaseSchemaService: DatabaseSchemaService,
    private readonly phaseImporters: readonly LegacyImportPhaseImporter[],
  ) {}

  async prepare(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportExecutionSummary> {
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

    const mutableExecutionSummary: {
      importedRows: number;
      skippedRows: number;
      warningCount: number;
    } = {
      importedRows: 0,
      skippedRows: 0,
      warningCount: command.warningCount,
    };

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

      for (const phaseImporter of this.phaseImporters) {
        const phaseResult: LegacyImportPhaseResult = await phaseImporter.import(
          queryRunner,
          command,
          progressListener,
        );

        mutableExecutionSummary.importedRows += phaseResult.importedRows;
        mutableExecutionSummary.skippedRows += phaseResult.skippedRows;
        mutableExecutionSummary.warningCount += phaseResult.warningCount;
      }

      const completedAt: string = new Date().toISOString();

      this.reportProgress(
        command,
        progressListener,
        'preparing-document-sequences',
        99,
        'Preparando las siguientes numeraciones de tickets y facturas…',
      );

      await this.prepareDocumentSequences(queryRunner, command, completedAt);

      await this.updateImportWarningCount(
        queryRunner,
        command.sourceHash,
        mutableExecutionSummary.warningCount,
      );

      this.reportProgress(
        command,
        progressListener,
        'completing-import-record',
        99,
        'Cerrando el registro interno de la importación…',
      );

      await this.completeImportRecord(
        queryRunner,
        command.sourceHash,
        mutableExecutionSummary.warningCount,
        completedAt,
      );

      this.reportProgress(
        command,
        progressListener,
        'validating-database',
        99,
        'Ejecutando la validación global de la base de datos…',
      );

      await this.databaseSchemaService.validate(queryRunner);

      await this.checkpointDatabase(queryRunner);

      await this.closeDatabase(queryRunner, dataSource);

      queryRunner = null;

      await this.deleteAuxiliaryFiles();

      return {
        importedRows: mutableExecutionSummary.importedRows,
        skippedRows: mutableExecutionSummary.skippedRows,
        warningCount: mutableExecutionSummary.warningCount,
      };
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

  private async updateImportWarningCount(
    queryRunner: QueryRunner,
    sourceHash: string,
    warningCount: number,
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE legacy_import
      SET
        warning_count = ?
      WHERE
        source_hash = ?
    `,
      [warningCount, sourceHash.toLowerCase()],
    );
  }

  private async prepareDocumentSequences(
    queryRunner: QueryRunner,

    command: LegacyImportExecutionCommand,

    completedAt: string,
  ): Promise<void> {
    this.assertInitialDocumentNumber(command.initialSaleNumber, 'ticket');

    this.assertInitialDocumentNumber(command.initialInvoiceNumber, 'factura');

    const maximumSaleNumber: number = await this.readMaximumDocumentNumber(queryRunner, 'venta');

    const maximumInvoiceNumber: number = await this.readMaximumDocumentNumber(
      queryRunner,
      'factura',
    );

    const lastSaleNumber: number = Math.max(maximumSaleNumber, command.initialSaleNumber - 1);

    const lastInvoiceNumber: number = Math.max(
      maximumInvoiceNumber,
      command.initialInvoiceNumber - 1,
    );

    await queryRunner.startTransaction();

    try {
      await this.upsertDocumentSequence(queryRunner, 'venta', lastSaleNumber, completedAt);

      await this.upsertDocumentSequence(queryRunner, 'factura', lastInvoiceNumber, completedAt);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    }
  }

  private async readMaximumDocumentNumber(
    queryRunner: QueryRunner,

    tableName: DocumentSourceTable,
  ): Promise<number> {
    const rows: readonly MaximumDocumentNumberRow[] = (await queryRunner.query(
      `
          SELECT
            COALESCE(
              MAX(numero),
              0
            ) AS maximumNumber
          FROM ${tableName}
          WHERE
            serie = ''
            AND numero IS NOT NULL
        `,
    )) as readonly MaximumDocumentNumberRow[];

    const maximumNumber: number = rows[0]?.maximumNumber ?? 0;

    if (!Number.isSafeInteger(maximumNumber) || maximumNumber < 0) {
      throw new Error(`La numeración máxima de ${tableName} no es válida.`);
    }

    return maximumNumber;
  }

  private async upsertDocumentSequence(
    queryRunner: QueryRunner,

    type: DocumentSequenceType,

    lastNumber: number,

    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO secuencia_documento (
        tipo,
        serie,
        ultimo_numero,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        '',
        ?,
        ?,
        ?
      )
      ON CONFLICT (
        tipo,
        serie
      )
      DO UPDATE SET
        ultimo_numero =
          CASE
            WHEN excluded.ultimo_numero
              > secuencia_documento.ultimo_numero
            THEN excluded.ultimo_numero
            ELSE secuencia_documento.ultimo_numero
          END,
        updated_at =
          excluded.updated_at
    `,
      [type, lastNumber, timestamp, timestamp],
    );
  }

  private async completeImportRecord(
    queryRunner: QueryRunner,

    sourceHash: string,

    warningCount: number,

    completedAt: string,
  ): Promise<void> {
    const status: 'success' | 'success_with_warnings' =
      warningCount > 0 ? 'success_with_warnings' : 'success';

    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `
        UPDATE legacy_import
        SET
          status = ?,
          completed_at = ?,
          warning_count = ?,
          error_count = 0
        WHERE
          source_hash = ?
      `,
        [status, completedAt, warningCount, sourceHash.toLowerCase()],
      );

      await queryRunner.query(
        `
        UPDATE application_metadata
        SET
          imported_at = ?
        WHERE
          id = 1
      `,
        [completedAt],
      );

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    }
  }

  private assertInitialDocumentNumber(
    value: number,

    documentName: string,
  ): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`El número inicial de ${documentName} no es válido.`);
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
