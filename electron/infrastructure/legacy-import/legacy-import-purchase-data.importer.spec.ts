import type LegacyImportDumpReader from '@backend/contracts/legacy-import/legacy-import-dump-reader.interface';
import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import/legacy-import-sql-insert-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacyImportPurchaseDataImporter from '@infrastructure/legacy-import/legacy-import-purchase-data.importer';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface ImportedPaymentMethodRow {
  readonly id: number;
  readonly id_tipo_pago: number | null;
  readonly forma_pago: string | null;
}

class FakeLegacyImportDumpReader implements LegacyImportDumpReader {
  constructor(private readonly inserts: readonly LegacySqlInsert[]) {}

  /**
   * Emite los INSERT legacy configurados que pertenezcan
   * a las tablas solicitadas por el importador.
   */
  read(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
    tableNames: readonly string[],
    listener: LegacyImportSqlInsertListener,
  ): Promise<void> {
    void packagePath;
    void expectedTableRows;

    for (const insert of this.inserts) {
      if (tableNames.includes(insert.tableName)) {
        listener(insert);
      }
    }

    return Promise.resolve();
  }
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let dataSource: DataSource | null = null;
let queryRunner: QueryRunner | null = null;

describe('LegacyImportPurchaseDataImporter', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-legacy-purchases-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'legacy-purchases.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    dataSource = await applicationDatabase.connect();

    for (const schema of completeDatabaseSchema) {
      for (const statement of schema.statements) {
        await dataSource.query(statement);
      }
    }

    await seedProvider(dataSource);

    queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
  });

  afterEach(async (): Promise<void> => {
    if (queryRunner !== null && !queryRunner.isReleased) {
      await queryRunner.release();
    }

    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    queryRunner = null;
    dataSource = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('importa exactamente las cinco formas de pago históricas', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyOrderInsert(1, 0),
      createLegacyOrderInsert(2, 1),
      createLegacyOrderInsert(3, 2),
      createLegacyOrderInsert(4, 3),
      createLegacyOrderInsert(5, 4),
    ];

    const importer: LegacyImportPurchaseDataImporter = createImporter(inserts);

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 5,
      skippedRows: 0,
      warningCount: 0,
    });

    expect(await readPaymentMethods()).toEqual([
      {
        id: 1,
        id_tipo_pago: null,
        forma_pago: 'Domiciliación bancaria',
      },
      {
        id: 2,
        id_tipo_pago: null,
        forma_pago: 'Tarjeta',
      },
      {
        id: 3,
        id_tipo_pago: null,
        forma_pago: 'Paypal',
      },
      {
        id: 4,
        id_tipo_pago: null,
        forma_pago: 'Al contado',
      },
      {
        id: 5,
        id_tipo_pago: null,
        forma_pago: 'Transferencia bancaria',
      },
    ]);
  });

  it('mantiene NULL cuando el pedido legacy no tiene forma de pago', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [createLegacyOrderInsert(1, null)];

    const importer: LegacyImportPurchaseDataImporter = createImporter(inserts);

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 1,
      skippedRows: 0,
      warningCount: 0,
    });

    expect(await readPaymentMethods()).toEqual([
      {
        id: 1,
        id_tipo_pago: null,
        forma_pago: null,
      },
    ]);
  });

  it('conserva el pedido y genera aviso para un índice legacy desconocido', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [createLegacyOrderInsert(1, 5)];

    const importer: LegacyImportPurchaseDataImporter = createImporter(inserts);

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 1,
      skippedRows: 0,
      warningCount: 1,
    });

    expect(await readPaymentMethods()).toEqual([
      {
        id: 1,
        id_tipo_pago: null,
        forma_pago: null,
      },
    ]);
  });
});

/**
 * Construye el importador utilizando las implementaciones
 * reales de lectura y normalización de valores.
 */
function createImporter(inserts: readonly LegacySqlInsert[]): LegacyImportPurchaseDataImporter {
  return new LegacyImportPurchaseDataImporter(
    new FakeLegacyImportDumpReader(inserts),
    new LegacySqlValueReader(),
    new LegacyImportNumberConverter(),
    new LegacyImportPublicIdFactory(),
  );
}

/**
 * Construye el comando mínimo necesario para ejecutar
 * una fase de importación de pedidos.
 */
function createExecutionCommand(orderCount: number): LegacyImportExecutionCommand {
  return {
    selectionId: 'legacy-purchase-test',
    packagePath: '/tmp/legacy-purchase-test.otpv',
    sourceApplication: 'Osumi TPV',
    sourceVersion: 'legacy',
    sourceSchemaVersion: 'legacy',
    sourceHash: 'a'.repeat(64),
    sourceRows: orderCount,
    initialSaleNumber: 0,
    initialInvoiceNumber: 0,
    expectedTableRows: {
      pedido: orderCount,
      linea_pedido: 0,
      vista_pedido: 0,
    },
    fileInventory: [],
    reviewDecisions: [],
    warningCount: 0,
    startedAt: '2026-09-11T10:00:00.000Z',
  };
}

/**
 * Construye una fila pedido del dump antiguo con una
 * forma de pago determinada.
 */
function createLegacyOrderInsert(id: number, paymentMethod: number | null): LegacySqlInsert {
  return {
    tableName: 'pedido',
    values: new Map<string, string | null>([
      ['id', String(id)],
      ['id_proveedor', '1'],
      ['metodo_pago', paymentMethod === null ? null : String(paymentMethod)],
      ['tipo', 'Factura'],
      ['num', `LEG-${id}`],
      ['importe', '10.50'],
      ['portes', '0'],
      ['descuento', '0'],
      ['fecha_pago', null],
      ['fecha_pedido', '2026-09-01'],
      ['fecha_recepcionado', null],
      ['re', '0'],
      ['europeo', '0'],
      ['faltas', '0'],
      ['recepcionado', '0'],
      ['observaciones', null],
      ['created_at', '2026-09-01T10:00:00.000Z'],
      ['updated_at', '2026-09-01T10:00:00.000Z'],
    ]),
  };
}

/**
 * Inserta el proveedor al que harán referencia los
 * pedidos del dump de prueba.
 */
async function seedProvider(currentDataSource: DataSource): Promise<void> {
  await currentDataSource.query(
    `
      INSERT INTO proveedor (
        id,
        public_id,
        nombre
      )
      VALUES (?, ?, ?)
    `,
    [1, 'legacy-test-provider', 'Proveedor de prueba'],
  );
}

/**
 * Obtiene el DataSource inicializado por el test.
 */
function requireDataSource(): DataSource {
  if (dataSource === null) {
    throw new Error('La base de datos de la prueba legacy no está inicializada.');
  }

  return dataSource;
}

/**
 * Obtiene el QueryRunner inicializado por el test.
 */
function requireQueryRunner(): QueryRunner {
  if (queryRunner === null) {
    throw new Error('El QueryRunner de la prueba legacy no está inicializado.');
  }

  return queryRunner;
}

/**
 * Recupera las formas de pago realmente persistidas
 * por el importador.
 */
async function readPaymentMethods(): Promise<readonly ImportedPaymentMethodRow[]> {
  return (await requireDataSource().query(
    `
      SELECT
        id,
        id_tipo_pago,
        forma_pago
      FROM pedido
      ORDER BY id
    `,
  )) as readonly ImportedPaymentMethodRow[];
}
