import type LegacyImportDumpReader from '@backend/contracts/legacy-import/legacy-import-dump-reader.interface';
import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import/legacy-import-sql-insert-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import LegacyImportHistoryDataImporter from '@infrastructure/legacy-import/legacy-import-history-data.importer';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';

class FakeLegacyImportDumpReader implements LegacyImportDumpReader {
  tableNames: readonly string[] = [];

  /**
   * Entrega una única caducidad legacy al importer.
   */
  read(
    _packagePath: string,
    _expectedTableRows: Readonly<Record<string, number>>,
    tableNames: readonly string[],
    listener: LegacyImportSqlInsertListener,
  ): Promise<void> {
    this.tableNames = tableNames;

    const insert: LegacySqlInsert = {
      tableName: 'caducidad',
      values: new Map<string, string | null>([
        ['id', '20'],
        ['id_articulo', '10'],
        ['unidades', '3'],
        ['puc', '11.92'],
        ['pvp', '16.90'],
        ['created_at', '2024-12-05 10:30:00'],
        ['updated_at', '2024-12-05 10:30:00'],
      ]),
    };

    listener(insert);

    return Promise.resolve();
  }
}

class FakeHistoryQueryRunner {
  isTransactionActive: boolean = false;
  committed: boolean = false;
  rolledBack: boolean = false;
  expirationInsertParameters: readonly unknown[] | null = null;
  executedStatements: string[] = [];

  /**
   * Simula el inicio de una transacción.
   */
  startTransaction(): Promise<void> {
    this.isTransactionActive = true;

    return Promise.resolve();
  }

  /**
   * Simula el commit de la importación.
   */
  commitTransaction(): Promise<void> {
    this.isTransactionActive = false;
    this.committed = true;

    return Promise.resolve();
  }

  /**
   * Simula el rollback de la importación.
   */
  rollbackTransaction(): Promise<void> {
    this.isTransactionActive = false;
    this.rolledBack = true;

    return Promise.resolve();
  }

  /**
   * Responde a las consultas mínimas utilizadas por
   * el importer y conserva los INSERT ejecutados.
   */
  query(sql: string, parameters: readonly unknown[] = []): Promise<unknown> {
    const normalizedSql: string = sql.replace(/\s+/g, ' ').trim();

    this.executedStatements.push(normalizedSql);

    if (normalizedSql.includes('SELECT id FROM articulo')) {
      return Promise.resolve([
        {
          id: 10,
        },
      ]);
    }

    if (
      normalizedSql.includes('SELECT id FROM venta') ||
      normalizedSql.includes('SELECT id FROM pedido')
    ) {
      return Promise.resolve([]);
    }

    if (normalizedSql.includes('FROM articulo a INNER JOIN marca m')) {
      return Promise.resolve([
        {
          id: 10,
          localizador: 240719,
          id_marca: 5,
          articulo_nombre: 'Altudog Ciervo sin cereales 1kg',
          marca_nombre: 'Altudog',
        },
      ]);
    }

    if (normalizedSql.includes('INSERT INTO merma_caducidad')) {
      this.expirationInsertParameters = parameters;
    }

    return Promise.resolve([]);
  }
}

const COMMAND: LegacyImportExecutionCommand = {
  selectionId: 'selection-1',
  packagePath: '/tmp/test.otpv',
  sourceApplication: 'TPV-API',
  sourceVersion: '1',
  sourceSchemaVersion: '1',
  sourceHash: 'legacy-source-hash',
  sourceRows: 1,
  initialSaleNumber: 1,
  initialInvoiceNumber: 1,
  expectedTableRows: {
    caducidad: 1,
  },
  fileInventory: [],
  reviewDecisions: [],
  warningCount: 0,
  startedAt: '2026-09-08T00:00:00.000Z',
};

describe('LegacyImportHistoryDataImporter', (): void => {
  it('importa caducidades legacy congelando el mejor snapshot disponible sin alterar stock', async (): Promise<void> => {
    const dumpReader: FakeLegacyImportDumpReader = new FakeLegacyImportDumpReader();

    const fakeQueryRunner: FakeHistoryQueryRunner = new FakeHistoryQueryRunner();

    const importer: LegacyImportHistoryDataImporter = new LegacyImportHistoryDataImporter(
      dumpReader,
      new LegacySqlValueReader(),
      new LegacyImportNumberConverter(),
      new LegacyImportPublicIdFactory(),
    );

    const result: LegacyImportPhaseResult = await importer.import(
      fakeQueryRunner as unknown as QueryRunner,
      COMMAND,
      (): void => undefined,
    );

    expect(dumpReader.tableNames).toContain('caducidad');

    expect(result).toEqual({
      importedRows: 1,
      skippedRows: 0,
      warningCount: 0,
    });

    expect(fakeQueryRunner.expirationInsertParameters).toEqual([
      20,
      expect.any(String),
      10,
      240719,
      5,
      'Altudog',
      'Altudog Ciervo sin cereales 1kg',
      3,
      11_920_000,
      1_690,
      '2024-12-05 10:30:00',
      '2024-12-05 10:30:00',
      '2024-12-05 10:30:00',
    ]);

    expect(
      fakeQueryRunner.executedStatements.some((sql: string): boolean =>
        sql.includes('UPDATE articulo'),
      ),
    ).toBe(false);

    expect(
      fakeQueryRunner.executedStatements.some((sql: string): boolean =>
        sql.includes('INSERT INTO historico_articulo'),
      ),
    ).toBe(false);

    expect(fakeQueryRunner.committed).toBe(true);

    expect(fakeQueryRunner.rolledBack).toBe(false);
  });
});
