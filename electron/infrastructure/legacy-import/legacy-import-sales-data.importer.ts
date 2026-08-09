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

interface LegacySaleRow {
  readonly id: number;

  readonly number: number;

  readonly employeeId: number;

  readonly customerId: number | null;

  readonly total: number;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

interface LegacySaleLineRow {
  readonly id: number;

  readonly saleId: number;

  readonly articleId: number | null;

  readonly articleName: string | null;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly taxRate: number;

  readonly total: number;

  readonly discount: number | null;

  readonly discountAmount: number | null;

  readonly returnedUnits: number;

  readonly units: number;

  readonly gift: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MutableSalesDataState {
  readonly sales: LegacySaleRow[];

  readonly saleLines: LegacySaleLineRow[];
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

interface IdRow {
  readonly id: number;
}

interface ArticleRow {
  readonly id: number;

  readonly nombre: string;
}

interface CashRegisterRow {
  readonly id: number;

  readonly apertura: string;

  readonly cierre: string | null;
}

interface SalesReferenceState {
  readonly employeeIds: ReadonlySet<number>;

  readonly fallbackEmployeeId: number;

  readonly customerIds: ReadonlySet<number>;

  readonly articleNames: ReadonlyMap<number, string>;

  readonly cashRegisters: readonly CashRegisterRow[];
}

interface CashRegisterResolution {
  readonly cashRegisterId: number;

  readonly exact: boolean;
}

const SALES_DATA_TABLES: readonly string[] = ['venta', 'linea_venta'];

export default class LegacyImportSalesDataImporter implements LegacyImportPhaseImporter {
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
      'reading-sales-data',
      99,
      'Leyendo ventas y líneas de venta…',
    );

    const state: MutableSalesDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      SALES_DATA_TABLES,
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
      const references: SalesReferenceState = await this.readReferences(queryRunner);

      const saleNumbers: ReadonlyMap<number, number> = this.normalizeSaleNumbers(
        state.sales,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-sales',
        99,
        'Importando ventas y asignándolas a sus cajas…',
      );

      const insertedSaleIds: ReadonlySet<number> = await this.insertSales(
        queryRunner,
        command,
        state.sales,
        saleNumbers,
        references,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-sale-lines',
        99,
        'Importando las líneas históricas de venta…',
      );

      await this.insertSaleLines(
        queryRunner,
        command,
        state.saleLines,
        insertedSaleIds,
        references.articleNames,
        counters,
      );

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

      throw new Error('No se han podido importar las ventas legacy.', {
        cause: error,
      });
    }
  }

  private createState(): MutableSalesDataState {
    return {
      sales: [],
      saleLines: [],
    };
  }

  private collectInsert(
    insert: LegacySqlInsert,

    state: MutableSalesDataState,
  ): void {
    switch (insert.tableName) {
      case 'venta':
        state.sales.push(this.readSale(insert));

        return;

      case 'linea_venta':
        state.saleLines.push(this.readSaleLine(insert));

        return;
    }
  }

  private readSale(insert: LegacySqlInsert): LegacySaleRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      number: this.valueReader.getRequiredInteger(insert, 'num_venta'),
      employeeId: this.valueReader.getRequiredInteger(insert, 'id_empleado'),
      customerId: this.valueReader.getOptionalInteger(insert, 'id_cliente'),
      total: this.valueReader.getRequiredNumber(insert, 'total'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readSaleLine(insert: LegacySqlInsert): LegacySaleLineRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      saleId: this.valueReader.getRequiredInteger(insert, 'id_venta'),
      articleId: this.valueReader.getOptionalInteger(insert, 'id_articulo'),
      articleName: this.valueReader.getOptionalText(insert, 'nombre_articulo'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      taxRate: this.valueReader.getRequiredNumber(insert, 'iva'),
      total: this.valueReader.getRequiredNumber(insert, 'importe'),
      discount: this.valueReader.getOptionalNumber(insert, 'descuento'),
      discountAmount: this.valueReader.getOptionalNumber(insert, 'importe_descuento'),
      returnedUnits: this.valueReader.getRequiredInteger(insert, 'devuelto'),
      units: this.valueReader.getRequiredInteger(insert, 'unidades'),
      gift: this.valueReader.getRequiredBoolean(insert, 'regalo'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private normalizeSaleNumbers(
    sales: readonly LegacySaleRow[],
    counters: MutableImportCounters,
  ): ReadonlyMap<number, number> {
    const normalizedNumbers: Map<number, number> = new Map<number, number>();

    const usedNumbers: Set<number> = new Set<number>();

    let maximumOriginalNumber: number = 0;

    for (const sale of sales) {
      if (sale.number > maximumOriginalNumber) {
        maximumOriginalNumber = sale.number;
      }
    }

    let nextGeneratedNumber: number = Math.max(1, maximumOriginalNumber + 1);

    const sortedSales: readonly LegacySaleRow[] = [...sales].sort(
      (first: LegacySaleRow, second: LegacySaleRow): number =>
        first.createdAt.localeCompare(second.createdAt) || first.id - second.id,
    );

    for (const sale of sortedSales) {
      if (sale.number > 0 && !usedNumbers.has(sale.number)) {
        normalizedNumbers.set(sale.id, sale.number);

        usedNumbers.add(sale.number);

        continue;
      }

      while (usedNumbers.has(nextGeneratedNumber)) {
        nextGeneratedNumber++;
      }

      if (!Number.isSafeInteger(nextGeneratedNumber)) {
        throw new Error('No se ha podido generar un número seguro para una venta.');
      }

      normalizedNumbers.set(sale.id, nextGeneratedNumber);

      usedNumbers.add(nextGeneratedNumber);

      nextGeneratedNumber++;
      counters.warningCount++;
    }

    return normalizedNumbers;
  }

  private async insertSales(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    sales: readonly LegacySaleRow[],
    saleNumbers: ReadonlyMap<number, number>,
    references: SalesReferenceState,
    counters: MutableImportCounters,
  ): Promise<ReadonlySet<number>> {
    const insertedSaleIds: Set<number> = new Set<number>();

    const sortedSales: readonly LegacySaleRow[] = [...sales].sort(
      (first: LegacySaleRow, second: LegacySaleRow): number => first.id - second.id,
    );

    for (const sale of sortedSales) {
      if (insertedSaleIds.has(sale.id)) {
        throw new Error(`La tabla venta contiene el identificador duplicado ${sale.id}.`);
      }

      const saleNumber: number | undefined = saleNumbers.get(sale.id);

      if (saleNumber === undefined) {
        throw new Error(`No se ha normalizado el número de la venta ${sale.id}.`);
      }

      let employeeId: number = sale.employeeId;

      if (!references.employeeIds.has(employeeId)) {
        employeeId = references.fallbackEmployeeId;

        counters.warningCount++;
      }

      let customerId: number | null = sale.customerId;

      if (customerId !== null && !references.customerIds.has(customerId)) {
        customerId = null;

        counters.warningCount++;
      }

      const cashRegister: CashRegisterResolution = this.resolveCashRegister(
        references.cashRegisters,
        sale.createdAt,
      );

      if (!cashRegister.exact) {
        counters.warningCount++;
      }

      await queryRunner.query(
        `
          INSERT INTO venta (
            id,
            public_id,
            id_caja,
            id_empleado,
            id_cliente,
            serie,
            numero,
            total_cents,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            '',
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          sale.id,
          this.publicIdFactory.create(command.sourceHash, 'venta', sale.id),
          cashRegister.cashRegisterId,
          employeeId,
          customerId,
          saleNumber,
          this.numberConverter.toCents(sale.total, `venta ${sale.id}.total`),
          sale.createdAt,
          sale.updatedAt,
          sale.deletedAt,
        ],
      );

      insertedSaleIds.add(sale.id);

      counters.importedRows++;
    }

    return insertedSaleIds;
  }

  private async insertSaleLines(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    lines: readonly LegacySaleLineRow[],
    saleIds: ReadonlySet<number>,
    articleNames: ReadonlyMap<number, string>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedLineIds: Set<number> = new Set<number>();

    const sortedLines: readonly LegacySaleLineRow[] = [...lines].sort(
      (first: LegacySaleLineRow, second: LegacySaleLineRow): number => first.id - second.id,
    );

    for (const line of sortedLines) {
      if (insertedLineIds.has(line.id)) {
        throw new Error(`La tabla linea_venta contiene el identificador duplicado ${line.id}.`);
      }

      if (!saleIds.has(line.saleId)) {
        throw new Error(
          [`La línea de venta ${line.id}`, `referencia la venta inexistente ${line.saleId}.`].join(
            ' ',
          ),
        );
      }

      let articleId: number | null = line.articleId;

      if (articleId !== null && !articleNames.has(articleId)) {
        articleId = null;

        counters.warningCount++;
      }

      const fallbackArticleName: string =
        articleId === null
          ? `Artículo legacy ${line.id}`
          : (articleNames.get(articleId) ?? `Artículo legacy ${line.id}`);

      const articleName: string = this.normalizeRequiredText(
        line.articleName,
        fallbackArticleName,
        200,
        counters,
      );

      const returnedUnits: number = this.normalizeReturnedUnits(line.returnedUnits, counters);

      await queryRunner.query(
        `
          INSERT INTO linea_venta (
            id,
            public_id,
            id_venta,
            id_articulo,
            nombre_articulo,
            puc_micros,
            pvp_micros,
            iva_bps,
            importe_micros,
            descuento_bps,
            importe_descuento_micros,
            unidades,
            unidades_devueltas,
            regalo,
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
          line.id,
          this.publicIdFactory.create(command.sourceHash, 'linea_venta', line.id),
          line.saleId,
          articleId,
          articleName,
          this.numberConverter.toMicros(
            this.normalizeNonNegativeNumber(line.purchasePrice, counters),
            `linea_venta ${line.id}.puc`,
          ),
          this.numberConverter.toMicros(line.salePrice, `linea_venta ${line.id}.pvp`),
          this.toBasisPoints(line.taxRate, `linea_venta ${line.id}.iva`, counters),
          this.numberConverter.toMicros(line.total, `linea_venta ${line.id}.importe`),
          this.toBasisPoints(line.discount ?? 0, `linea_venta ${line.id}.descuento`, counters),
          this.numberConverter.toMicros(
            this.normalizeNonNegativeNumber(line.discountAmount ?? 0, counters),
            `linea_venta ${line.id}.importe_descuento`,
          ),
          line.units,
          returnedUnits,
          line.gift ? 1 : 0,
          line.createdAt,
          line.updatedAt,
        ],
      );

      insertedLineIds.add(line.id);

      counters.importedRows++;
    }
  }

  private async readReferences(queryRunner: QueryRunner): Promise<SalesReferenceState> {
    const employeeRows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM empleado
            ORDER BY id
          `,
    )) as readonly IdRow[];

    const fallbackEmployeeId: number | undefined = employeeRows[0]?.id;

    if (fallbackEmployeeId === undefined) {
      throw new Error('No existe ningún empleado para asociar las ventas.');
    }

    const customerRows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM cliente
          `,
    )) as readonly IdRow[];

    const articleRows: readonly ArticleRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              nombre
            FROM articulo
          `,
    )) as readonly ArticleRow[];

    const cashRegisters: readonly CashRegisterRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              apertura,
              cierre
            FROM caja
            ORDER BY
              apertura,
              id
          `,
    )) as readonly CashRegisterRow[];

    if (cashRegisters.length === 0) {
      throw new Error('No existe ninguna caja para asociar las ventas.');
    }

    return {
      employeeIds: new Set<number>(employeeRows.map((row: IdRow): number => row.id)),
      fallbackEmployeeId,
      customerIds: new Set<number>(customerRows.map((row: IdRow): number => row.id)),
      articleNames: new Map<number, string>(
        articleRows.map((row: ArticleRow): [number, string] => [row.id, row.nombre]),
      ),
      cashRegisters,
    };
  }

  private resolveCashRegister(
    cashRegisters: readonly CashRegisterRow[],
    saleDate: string,
  ): CashRegisterResolution {
    const exactCashRegisters: readonly CashRegisterRow[] = cashRegisters.filter(
      (cashRegister: CashRegisterRow): boolean =>
        cashRegister.apertura <= saleDate &&
        (cashRegister.cierre === null || saleDate <= cashRegister.cierre),
    );

    const exactCashRegister: CashRegisterRow | undefined =
      exactCashRegisters[exactCashRegisters.length - 1];

    if (exactCashRegister !== undefined) {
      return {
        cashRegisterId: exactCashRegister.id,
        exact: true,
      };
    }

    const previousCashRegisters: readonly CashRegisterRow[] = cashRegisters.filter(
      (cashRegister: CashRegisterRow): boolean => cashRegister.apertura <= saleDate,
    );

    const previousCashRegister: CashRegisterRow | undefined =
      previousCashRegisters[previousCashRegisters.length - 1];

    if (previousCashRegister !== undefined) {
      return {
        cashRegisterId: previousCashRegister.id,
        exact: false,
      };
    }

    const firstCashRegister: CashRegisterRow | undefined = cashRegisters[0];

    if (firstCashRegister === undefined) {
      throw new Error('No existe ninguna caja disponible.');
    }

    return {
      cashRegisterId: firstCashRegister.id,
      exact: false,
    };
  }

  private normalizeReturnedUnits(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return Math.abs(value);
  }

  private normalizeNonNegativeNumber(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private toBasisPoints(
    percentage: number,
    fieldName: string,
    counters: MutableImportCounters,
  ): number {
    let normalizedPercentage: number = percentage;

    if (normalizedPercentage < 0) {
      normalizedPercentage = 0;

      counters.warningCount++;
    } else if (normalizedPercentage > 100) {
      normalizedPercentage = 100;

      counters.warningCount++;
    }

    return this.numberConverter.toBasisPoints(normalizedPercentage, fieldName);
  }

  private normalizeRequiredText(
    value: string | null,
    fallback: string,
    maximumLength: number,
    counters: MutableImportCounters,
  ): string {
    let normalized: string = value?.trim() ?? '';

    if (normalized.length === 0) {
      normalized = fallback;

      counters.warningCount++;
    }

    if (normalized.length > maximumLength) {
      normalized = normalized.slice(0, maximumLength);

      counters.warningCount++;
    }

    return normalized;
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
