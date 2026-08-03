import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportExecutionSummary from '@backend/domain/legacy-import/legacy-import-execution-summary.interface';
import type {
  LegacyImportWorkerData,
  LegacyImportWorkerFailedMessage,
  LegacyImportWorkerMessage,
} from '@backend/domain/legacy-import/legacy-import-worker-contracts';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmLegacyImportDatabase from '@infrastructure/database/typeorm/typeorm-legacy-import-database';
import LegacyImportMasterDataImporter from '@infrastructure/legacy-import/legacy-import-master-data.importer';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import YauzlLegacyImportDumpReader from '@infrastructure/legacy-import/yauzl-legacy-import-dump.reader';
import { parentPort, workerData } from 'node:worker_threads';

async function run(): Promise<void> {
  if (parentPort === null) {
    throw new Error('El Worker de importación no dispone de parentPort.');
  }

  const workerParentPort: NonNullable<typeof parentPort> = parentPort;

  const data: LegacyImportWorkerData = workerData as LegacyImportWorkerData;

  const dataSourceFactory: TypeOrmDataSourceFactory = new TypeOrmDataSourceFactory();

  const databaseSchemaService: DatabaseSchemaService = new DatabaseSchemaService(
    completeDatabaseSchema,
    completeDatabaseSchemaTables,
  );

  const mariaDbInsertParser: MariaDbInsertParser = new MariaDbInsertParser();

  const legacyImportDumpReader: YauzlLegacyImportDumpReader = new YauzlLegacyImportDumpReader(
    mariaDbInsertParser,
  );

  const legacySqlValueReader: LegacySqlValueReader = new LegacySqlValueReader();

  const legacyImportPublicIdFactory: LegacyImportPublicIdFactory =
    new LegacyImportPublicIdFactory();

  const legacyImportMasterDataImporter: LegacyImportMasterDataImporter =
    new LegacyImportMasterDataImporter(
      legacyImportDumpReader,
      legacySqlValueReader,
      legacyImportPublicIdFactory,
    );

  const legacyImportDatabase: TypeOrmLegacyImportDatabase = new TypeOrmLegacyImportDatabase(
    data.databaseFile,
    data.applicationVersion,
    dataSourceFactory,
    databaseSchemaService,
    [legacyImportMasterDataImporter],
  );

  const progressListener: LegacyImportProgressListener = (progress: LegacyImportProgress): void => {
    const message: LegacyImportWorkerMessage = {
      type: 'progress',
      progress,
    };

    workerParentPort.postMessage(message);
  };

  try {
    const executionSummary: LegacyImportExecutionSummary = await legacyImportDatabase.prepare(
      data.command,
      progressListener,
    );

    const completedAt: string = new Date().toISOString();

    progressListener({
      selectionId: data.command.selectionId,
      stage: 'completed',
      percentage: 100,
      message: 'La base de datos temporal está preparada.',
    });

    const result: LegacyImportStartResult = {
      status: 'database-prepared',
      selectionId: data.command.selectionId,
      startedAt: data.command.startedAt,
      completedAt,
      sourceRows: data.command.sourceRows,
      importedRows: executionSummary.importedRows,
      skippedRows: executionSummary.skippedRows,
      warningCount: executionSummary.warningCount,
    };

    const message: LegacyImportWorkerMessage = {
      type: 'completed',
      result,
    };

    workerParentPort.postMessage(message);
  } catch (error: unknown) {
    const failure: LegacyImportWorkerFailedMessage = {
      type: 'failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
    };

    workerParentPort.postMessage(failure);
  }
}

void run();
