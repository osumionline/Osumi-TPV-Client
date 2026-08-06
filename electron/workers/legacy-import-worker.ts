import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import DefaultLegacyImportCatalogNormalizer from '@backend/domain/legacy-import/default-legacy-import-catalog.normalizer';
import DefaultLegacyImportCatalogValidator from '@backend/domain/legacy-import/default-legacy-import-catalog.validator';
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
import DefaultLegacyImportCatalogReader from '@infrastructure/legacy-import/default-legacy-import-catalog.reader';
import LegacyImportCashDataImporter from '@infrastructure/legacy-import/legacy-import-cash-data.importer';
import LegacyImportCatalogImporter from '@infrastructure/legacy-import/legacy-import-catalog.importer';
import LegacyImportCustomerDataImporter from '@infrastructure/legacy-import/legacy-import-customer-data.importer';
import LegacyImportFilesImporter from '@infrastructure/legacy-import/legacy-import-files.importer';
import LegacyImportMasterDataImporter from '@infrastructure/legacy-import/legacy-import-master-data.importer';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacyImportSalePaymentDataImporter from '@infrastructure/legacy-import/legacy-import-sale-payment-data.importer';
import LegacyImportSalesDataImporter from '@infrastructure/legacy-import/legacy-import-sales-data.importer';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import YauzlLegacyImportDumpReader from '@infrastructure/legacy-import/yauzl-legacy-import-dump.reader';
import { parentPort, workerData } from 'node:worker_threads';

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const messages: string[] = [error.message];

  let cause: unknown = error.cause;

  while (cause instanceof Error) {
    if (!messages.includes(cause.message)) {
      messages.push(cause.message);
    }

    cause = cause.cause;
  }

  return messages.join(' Detalle: ');
}

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

  const legacyImportCatalogReader: DefaultLegacyImportCatalogReader =
    new DefaultLegacyImportCatalogReader(legacyImportDumpReader, legacySqlValueReader);

  const legacyImportCatalogValidator: DefaultLegacyImportCatalogValidator =
    new DefaultLegacyImportCatalogValidator();

  const legacyImportNumberConverter: LegacyImportNumberConverter =
    new LegacyImportNumberConverter();

  const legacyImportCatalogNormalizer: DefaultLegacyImportCatalogNormalizer =
    new DefaultLegacyImportCatalogNormalizer(
      legacyImportNumberConverter,
      legacyImportPublicIdFactory,
    );

  const legacyImportCatalogImporter: LegacyImportCatalogImporter = new LegacyImportCatalogImporter(
    legacyImportCatalogReader,
    legacyImportCatalogValidator,
    legacyImportCatalogNormalizer,
    legacyImportPublicIdFactory,
  );

  const legacyImportFilesImporter: LegacyImportFilesImporter = new LegacyImportFilesImporter(
    data.stagingFilesDirectory,
    legacyImportCatalogReader,
    legacyImportPublicIdFactory,
  );

  const legacyImportCustomerDataImporter: LegacyImportCustomerDataImporter =
    new LegacyImportCustomerDataImporter(
      legacyImportDumpReader,
      legacySqlValueReader,
      legacyImportNumberConverter,
      legacyImportPublicIdFactory,
    );

  const legacyImportCashDataImporter: LegacyImportCashDataImporter =
    new LegacyImportCashDataImporter(
      legacyImportDumpReader,
      legacySqlValueReader,
      legacyImportNumberConverter,
      legacyImportPublicIdFactory,
    );

  const legacyImportSalesDataImporter: LegacyImportSalesDataImporter =
    new LegacyImportSalesDataImporter(
      legacyImportDumpReader,
      legacySqlValueReader,
      legacyImportNumberConverter,
      legacyImportPublicIdFactory,
    );

  const legacyImportSalePaymentDataImporter: LegacyImportSalePaymentDataImporter =
    new LegacyImportSalePaymentDataImporter(
      legacyImportDumpReader,
      legacySqlValueReader,
      legacyImportNumberConverter,
      legacyImportPublicIdFactory,
    );

  const legacyImportDatabase: TypeOrmLegacyImportDatabase = new TypeOrmLegacyImportDatabase(
    data.databaseFile,
    data.applicationVersion,
    dataSourceFactory,
    databaseSchemaService,
    [
      legacyImportMasterDataImporter,
      legacyImportCatalogImporter,
      legacyImportFilesImporter,
      legacyImportCustomerDataImporter,
      legacyImportCashDataImporter,
      legacyImportSalesDataImporter,
      legacyImportSalePaymentDataImporter,
    ],
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
      message: getErrorMessage(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
    };

    workerParentPort.postMessage(failure);
  }
}

void run();
