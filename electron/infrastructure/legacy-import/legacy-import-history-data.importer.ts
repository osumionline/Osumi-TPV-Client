import type LegacyImportDumpReader from '@backend/contracts/legacy-import/legacy-import-dump-reader.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import type { QueryRunner } from 'typeorm';

interface LegacyArticleHistoryRow {
  readonly id: number;

  readonly articleId: number;

  readonly type: number;

  readonly previousStock: number;

  readonly difference: number;

  readonly finalStock: number;

  readonly saleId: number | null;

  readonly orderId: number | null;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyWarehouseHistoryRow {
  readonly id: number;

  readonly year: number;

  readonly month: number;

  readonly day: number;

  readonly totalPurchasePrice: number;

  readonly totalSalePrice: number;

  readonly averageMargin: number;

  readonly createdAt: string | null;

  readonly updatedAt: string | null;
}

interface NormalizedWarehouseHistoryRow {
  readonly source: LegacyWarehouseHistoryRow;

  readonly date: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MutableHistoryDataState {
  readonly articleHistory: LegacyArticleHistoryRow[];

  readonly warehouseHistory: LegacyWarehouseHistoryRow[];
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

interface IdRow {
  readonly id: number;
}

type ReferenceTable = 'articulo' | 'venta' | 'pedido';

const HISTORY_DATA_TABLES: readonly string[] = ['historico_articulo', 'historico_almacen'];

export default class LegacyImportHistoryDataImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly dumpReader: LegacyImportDumpReader,
    private readonly valueReader: LegacySqlValueReader,
    private readonly numberConverter: LegacyImportNumberConverter,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    this.reportProgress(
      command,
      progressListener,
      'reading-history-data',
      99,
      'Leyendo el histórico de artículos y almacén…',
    );

    const state: MutableHistoryDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      HISTORY_DATA_TABLES,
      (insert: LegacySqlInsert): void => {
        this.collectInsert(insert, state);
      },
    );

    const counters: MutableImportCounters = {
      importedRows: 0,
      skippedRows: 0,
      warningCount: 0,
    };

    await queryRunner.startTransaction();

    try {
      const articleIds: ReadonlySet<number> = await this.readIdSet(queryRunner, 'articulo');

      const saleIds: ReadonlySet<number> = await this.readIdSet(queryRunner, 'venta');

      const orderIds: ReadonlySet<number> = await this.readIdSet(queryRunner, 'pedido');

      this.reportProgress(
        command,
        progressListener,
        'importing-article-history',
        99,
        'Importando los movimientos históricos de stock…',
      );

      await this.insertArticleHistory(
        queryRunner,
        command,
        state.articleHistory,
        articleIds,
        saleIds,
        orderIds,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-warehouse-history',
        99,
        'Importando las fotografías diarias del almacén…',
      );

      await this.insertWarehouseHistory(queryRunner, command, state.warehouseHistory, counters);

      await queryRunner.commitTransaction();

      return {
        importedRows: counters.importedRows,
        skippedRows: counters.skippedRows,
        warningCount: counters.warningCount,
      };
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error(
        ['No se han podido importar', 'los históricos de artículos y almacén.'].join(' '),
        {
          cause: error,
        },
      );
    }
  }

  private createState(): MutableHistoryDataState {
    return {
      articleHistory: [],
      warehouseHistory: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: MutableHistoryDataState): void {
    switch (insert.tableName) {
      case 'historico_articulo':
        state.articleHistory.push(this.readArticleHistory(insert));

        return;

      case 'historico_almacen':
        state.warehouseHistory.push(this.readWarehouseHistory(insert));

        return;
    }
  }

  private readArticleHistory(insert: LegacySqlInsert): LegacyArticleHistoryRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      type: this.valueReader.getRequiredInteger(insert, 'tipo'),
      previousStock: this.valueReader.getRequiredInteger(insert, 'stock_previo'),
      difference: this.valueReader.getRequiredInteger(insert, 'diferencia'),
      finalStock: this.valueReader.getRequiredInteger(insert, 'stock_final'),
      saleId: this.valueReader.getOptionalInteger(insert, 'id_venta'),
      orderId: this.valueReader.getOptionalInteger(insert, 'id_pedido'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readWarehouseHistory(insert: LegacySqlInsert): LegacyWarehouseHistoryRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      year: this.valueReader.getRequiredInteger(insert, 'year'),
      month: this.valueReader.getRequiredInteger(insert, 'month'),
      day: this.valueReader.getRequiredInteger(insert, 'day'),
      totalPurchasePrice: this.valueReader.getRequiredNumber(insert, 'total_puc'),
      totalSalePrice: this.valueReader.getRequiredNumber(insert, 'total_pvp'),
      averageMargin: this.valueReader.getRequiredNumber(insert, 'media_margen'),
      createdAt: this.valueReader.getOptionalText(insert, 'created_at'),
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at'),
    };
  }

  private async insertArticleHistory(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    rows: readonly LegacyArticleHistoryRow[],
    articleIds: ReadonlySet<number>,
    saleIds: ReadonlySet<number>,
    orderIds: ReadonlySet<number>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedIds: Set<number> = new Set<number>();

    const sortedRows: readonly LegacyArticleHistoryRow[] = [...rows].sort(
      (first: LegacyArticleHistoryRow, second: LegacyArticleHistoryRow): number =>
        first.id - second.id,
    );

    for (const row of sortedRows) {
      if (insertedIds.has(row.id)) {
        throw new Error(
          ['La tabla historico_articulo', `contiene el identificador duplicado ${row.id}.`].join(
            ' ',
          ),
        );
      }

      if (!articleIds.has(row.articleId)) {
        throw new Error(
          [
            `El histórico de artículo ${row.id}`,
            `referencia el artículo inexistente ${row.articleId}.`,
          ].join(' '),
        );
      }

      const saleId: number | null = this.normalizeOptionalReference(row.saleId, saleIds, counters);

      const orderId: number | null = this.normalizeOptionalReference(
        row.orderId,
        orderIds,
        counters,
      );

      const type: number = this.normalizeHistoryType(row.type, counters);

      const purchasePrice: number = this.normalizeNonNegativeNumber(row.purchasePrice, counters);

      await queryRunner.query(
        `
          INSERT INTO historico_articulo (
            id,
            public_id,
            id_articulo,
            tipo,
            stock_previo,
            diferencia,
            stock_final,
            id_venta,
            id_pedido,
            id_merma_caducidad,
            puc_micros,
            pvp_micros,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          row.id,
          this.publicIdFactory.create(command.sourceHash, 'historico_articulo', row.id),
          row.articleId,
          type,
          row.previousStock,
          row.difference,
          row.finalStock,
          saleId,
          orderId,
          this.numberConverter.toMicros(purchasePrice, `historico_articulo ${row.id}.puc`),
          /*
           * El esquema permite un PVP histórico
           * negativo, así que se conserva literalmente.
           */
          this.numberConverter.toMicros(row.salePrice, `historico_articulo ${row.id}.pvp`),
          row.createdAt,
          row.updatedAt,
        ],
      );

      insertedIds.add(row.id);

      counters.importedRows++;
    }
  }

  private async insertWarehouseHistory(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    rows: readonly LegacyWarehouseHistoryRow[],
    counters: MutableImportCounters,
  ): Promise<void> {
    const normalizedRows: readonly NormalizedWarehouseHistoryRow[] = this.normalizeWarehouseHistory(
      rows,
      counters,
    );

    for (const row of normalizedRows) {
      await queryRunner.query(
        `
          INSERT INTO historico_almacen (
            id,
            public_id,
            fecha,
            total_puc_cents,
            total_pvp_cents,
            margen_medio_microporcentaje,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          row.source.id,
          this.publicIdFactory.create(command.sourceHash, 'historico_almacen', row.source.id),
          row.date,
          /*
           * Los totales negativos son válidos porque
           * el stock de los artículos también puede
           * ser negativo.
           */
          this.numberConverter.toCents(
            row.source.totalPurchasePrice,
            `historico_almacen ${row.source.id}.total_puc`,
          ),
          this.numberConverter.toCents(
            row.source.totalSalePrice,
            `historico_almacen ${row.source.id}.total_pvp`,
          ),
          this.numberConverter.toMicropercentage(
            row.source.averageMargin,
            `historico_almacen ${row.source.id}.media_margen`,
          ),
          row.createdAt,
          row.updatedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private normalizeWarehouseHistory(
    rows: readonly LegacyWarehouseHistoryRow[],
    counters: MutableImportCounters,
  ): readonly NormalizedWarehouseHistoryRow[] {
    const normalizedByDate: Map<string, NormalizedWarehouseHistoryRow> = new Map<
      string,
      NormalizedWarehouseHistoryRow
    >();

    const usedIds: Set<number> = new Set<number>();

    const sortedRows: readonly LegacyWarehouseHistoryRow[] = [...rows].sort(
      (first: LegacyWarehouseHistoryRow, second: LegacyWarehouseHistoryRow): number =>
        first.id - second.id,
    );

    for (const row of sortedRows) {
      if (usedIds.has(row.id)) {
        throw new Error(
          ['La tabla historico_almacen', `contiene el identificador duplicado ${row.id}.`].join(
            ' ',
          ),
        );
      }

      usedIds.add(row.id);

      const date: string = this.createDate(row.year, row.month, row.day, row.id);

      const fallbackTimestamp: string = `${date} 00:00:00`;

      const createdAt: string = row.createdAt ?? fallbackTimestamp;

      const updatedAt: string = row.updatedAt ?? createdAt;

      if (row.createdAt === null) {
        counters.warningCount++;
      }

      const normalizedRow: NormalizedWarehouseHistoryRow = {
        source: row,
        date,
        createdAt,
        updatedAt,
      };

      const existingRow: NormalizedWarehouseHistoryRow | undefined = normalizedByDate.get(date);

      if (existingRow === undefined) {
        normalizedByDate.set(date, normalizedRow);

        continue;
      }

      /*
       * SQLite permite una sola fotografía por día.
       * Si el legacy contiene varias, se conserva la
       * versión más reciente de ese día.
       */
      if (this.isNewerWarehouseSnapshot(normalizedRow, existingRow)) {
        normalizedByDate.set(date, normalizedRow);
      }

      counters.skippedRows++;
      counters.warningCount++;
    }

    return [...normalizedByDate.values()].sort(
      (first: NormalizedWarehouseHistoryRow, second: NormalizedWarehouseHistoryRow): number =>
        first.date.localeCompare(second.date) || first.source.id - second.source.id,
    );
  }

  private isNewerWarehouseSnapshot(
    candidate: NormalizedWarehouseHistoryRow,
    current: NormalizedWarehouseHistoryRow,
  ): boolean {
    const timestampComparison: number = candidate.updatedAt.localeCompare(current.updatedAt);

    if (timestampComparison !== 0) {
      return timestampComparison > 0;
    }

    return candidate.source.id > current.source.id;
  }

  private createDate(year: number, month: number, day: number, sourceId: number): string {
    if (year < 1 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(
        [
          `El histórico de almacén ${sourceId}`,
          `contiene la fecha inválida ${year}-${month}-${day}.`,
        ].join(' '),
      );
    }

    const date: Date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(
        [
          `El histórico de almacén ${sourceId}`,
          `contiene la fecha inexistente ${year}-${month}-${day}.`,
        ].join(' '),
      );
    }

    return [
      year.toString().padStart(4, '0'),
      month.toString().padStart(2, '0'),
      day.toString().padStart(2, '0'),
    ].join('-');
  }

  private normalizeOptionalReference(
    id: number | null,
    validIds: ReadonlySet<number>,
    counters: MutableImportCounters,
  ): number | null {
    if (id === null) {
      return null;
    }

    if (validIds.has(id)) {
      return id;
    }

    counters.warningCount++;

    return null;
  }

  private normalizeHistoryType(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizeNonNegativeNumber(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private async readIdSet(
    queryRunner: QueryRunner,
    tableName: ReferenceTable,
  ): Promise<ReadonlySet<number>> {
    const rows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM ${tableName}
          `,
    )) as readonly IdRow[];

    return new Set<number>(rows.map((row: IdRow): number => row.id));
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
}
