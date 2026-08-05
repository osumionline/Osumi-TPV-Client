import type LegacyImportDumpReader from '@backend/contracts/legacy-import-dump-reader.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import type { QueryRunner } from 'typeorm';

interface LegacyCashDenomination {
  readonly valueCents: number;

  readonly quantity: number;
}

interface LegacyCashRegisterRow {
  readonly id: number;

  readonly opening: string;

  readonly closing: string | null;

  readonly sales: number;

  readonly profit: number;

  readonly cashSales: number;

  readonly cashOperations: number;

  readonly cashDiscount: number;

  readonly otherDiscount: number;

  readonly cashPaymentsAmount: number;

  readonly openingAmount: number;

  readonly closingAmount: number;

  readonly realClosingAmount: number;

  readonly withdrawnAmount: number;

  readonly inputAmount: number;

  readonly denominations: readonly LegacyCashDenomination[];

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyCashTypeRow {
  readonly cashRegisterId: number;

  readonly paymentTypeId: number;

  readonly operations: number;

  readonly total: number | null;

  readonly realTotal: number | null;

  readonly discountAmount: number | null;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyCashMovementRow {
  readonly id: number;

  readonly concept: string;

  readonly amount: number;

  readonly description: string | null;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MutableCashDataState {
  readonly cashRegisters: LegacyCashRegisterRow[];

  readonly cashTypes: LegacyCashTypeRow[];

  readonly cashMovements: LegacyCashMovementRow[];
}

interface NormalizedCashRegister {
  readonly source: LegacyCashRegisterRow;

  readonly closing: string | null;
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

interface IdRow {
  readonly id: number;
}

interface MaximumIdRow {
  readonly maximumId: number;
}

interface MinimumOrderRow {
  readonly minimumOrder: number;
}

interface CashRegisterResolution {
  readonly cashRegisterId: number;

  readonly exact: boolean;
}

const CASH_DATA_TABLES: readonly string[] = ['caja', 'caja_tipo', 'pago_caja'];

const CASH_PAYMENT_TYPE_NAME: string = 'Efectivo';

const CASH_PAYMENT_TYPE_SLUG: string = 'efectivo';

export default class LegacyImportCashDataImporter implements LegacyImportPhaseImporter {
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
      'reading-cash-data',
      98,
      'Leyendo cajas y movimientos de efectivo…',
    );

    const state: MutableCashDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      CASH_DATA_TABLES,
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
      const cashPaymentTypeId: number = await this.ensureCashPaymentType(
        queryRunner,
        command,
        counters,
      );

      const normalizedCashRegisters: readonly NormalizedCashRegister[] =
        this.normalizeCashRegisters(state.cashRegisters, state.cashMovements, command, counters);

      this.reportProgress(
        command,
        progressListener,
        'importing-cash-registers',
        98,
        'Importando aperturas y cierres de caja…',
      );

      await this.insertCashRegisters(queryRunner, command, normalizedCashRegisters, counters);

      this.reportProgress(
        command,
        progressListener,
        'importing-cash-breakdowns',
        98,
        'Importando recuentos y desgloses por forma de pago…',
      );

      await this.insertCashBreakdowns(
        queryRunner,
        normalizedCashRegisters,
        state.cashTypes,
        cashPaymentTypeId,
        counters,
      );

      await this.insertCashCounts(queryRunner, normalizedCashRegisters, counters);

      this.reportProgress(
        command,
        progressListener,
        'importing-cash-movements',
        98,
        'Importando movimientos de caja…',
      );

      await this.insertCashMovements(
        queryRunner,
        command,
        normalizedCashRegisters,
        state.cashMovements,
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

      throw new Error('No se han podido importar las cajas legacy.', {
        cause: error,
      });
    }
  }

  private createState(): MutableCashDataState {
    return {
      cashRegisters: [],
      cashTypes: [],
      cashMovements: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: MutableCashDataState): void {
    switch (insert.tableName) {
      case 'caja':
        state.cashRegisters.push(this.readCashRegister(insert));

        return;

      case 'caja_tipo':
        state.cashTypes.push(this.readCashType(insert));

        return;

      case 'pago_caja':
        state.cashMovements.push(this.readCashMovement(insert));

        return;
    }
  }

  private readCashRegister(insert: LegacySqlInsert): LegacyCashRegisterRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      opening: this.valueReader.getRequiredText(insert, 'apertura'),
      closing: this.valueReader.getOptionalText(insert, 'cierre'),
      sales: this.valueReader.getRequiredNumber(insert, 'ventas'),
      profit: this.valueReader.getRequiredNumber(insert, 'beneficios'),
      cashSales: this.valueReader.getRequiredNumber(insert, 'venta_efectivo'),
      cashOperations: this.valueReader.getRequiredInteger(insert, 'operaciones_efectivo'),
      cashDiscount: this.valueReader.getRequiredNumber(insert, 'descuento_efectivo'),
      otherDiscount: this.valueReader.getRequiredNumber(insert, 'descuento_otros'),
      cashPaymentsAmount: this.valueReader.getRequiredNumber(insert, 'importe_pagos_caja'),
      openingAmount: this.valueReader.getRequiredNumber(insert, 'importe_apertura'),
      closingAmount: this.valueReader.getRequiredNumber(insert, 'importe_cierre'),
      realClosingAmount: this.valueReader.getRequiredNumber(insert, 'importe_cierre_real'),
      withdrawnAmount: this.valueReader.getRequiredNumber(insert, 'importe_retirado'),
      inputAmount: this.valueReader.getRequiredNumber(insert, 'importe_entrada'),
      denominations: [
        this.readDenomination(insert, 'importe1c', 1),
        this.readDenomination(insert, 'importe2c', 2),
        this.readDenomination(insert, 'importe5c', 5),
        this.readDenomination(insert, 'importe10c', 10),
        this.readDenomination(insert, 'importe20c', 20),
        this.readDenomination(insert, 'importe50c', 50),
        this.readDenomination(insert, 'importe1', 100),
        this.readDenomination(insert, 'importe2', 200),
        this.readDenomination(insert, 'importe5', 500),
        this.readDenomination(insert, 'importe10', 1_000),
        this.readDenomination(insert, 'importe20', 2_000),
        this.readDenomination(insert, 'importe50', 5_000),
        this.readDenomination(insert, 'importe100', 10_000),
        this.readDenomination(insert, 'importe200', 20_000),
        this.readDenomination(insert, 'importe500', 50_000),
      ],
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readDenomination(
    insert: LegacySqlInsert,
    columnName: string,
    valueCents: number,
  ): LegacyCashDenomination {
    return {
      valueCents,
      quantity: this.valueReader.getRequiredInteger(insert, columnName),
    };
  }

  private readCashType(insert: LegacySqlInsert): LegacyCashTypeRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      cashRegisterId: this.valueReader.getRequiredInteger(insert, 'id_caja'),
      paymentTypeId: this.valueReader.getRequiredInteger(insert, 'id_tipo_pago'),
      operations: this.valueReader.getRequiredInteger(insert, 'operaciones'),
      total: this.valueReader.getOptionalNumber(insert, 'importe_total'),
      realTotal: this.valueReader.getOptionalNumber(insert, 'importe_real'),
      discountAmount: this.valueReader.getOptionalNumber(insert, 'importe_descuento'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readCashMovement(insert: LegacySqlInsert): LegacyCashMovementRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      concept: this.valueReader.getRequiredText(insert, 'concepto'),
      amount: this.valueReader.getRequiredNumber(insert, 'importe'),
      description: this.valueReader.getOptionalText(insert, 'descripcion'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private async ensureCashPaymentType(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    counters: MutableImportCounters,
  ): Promise<number> {
    const existingRows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM tipo_pago
            WHERE
              slug = ?
                COLLATE NOCASE
              AND deleted_at IS NULL
            ORDER BY
              id
            LIMIT 1
          `,
      [CASH_PAYMENT_TYPE_SLUG],
    )) as readonly IdRow[];

    const existingId: number | undefined = existingRows[0]?.id;

    if (existingId !== undefined) {
      return existingId;
    }

    const maximumIdRows: readonly MaximumIdRow[] = (await queryRunner.query(
      `
            SELECT
              COALESCE(
                MAX(id),
                0
              ) AS maximumId
            FROM tipo_pago
          `,
    )) as readonly MaximumIdRow[];

    const minimumOrderRows: readonly MinimumOrderRow[] = (await queryRunner.query(
      `
            SELECT
              COALESCE(
                MIN(orden),
                0
              ) AS minimumOrder
            FROM tipo_pago
          `,
    )) as readonly MinimumOrderRow[];

    const paymentTypeId: number = (maximumIdRows[0]?.maximumId ?? 0) + 1;

    const order: number = (minimumOrderRows[0]?.minimumOrder ?? 0) - 1;

    await queryRunner.query(
      `
        INSERT INTO tipo_pago (
          id,
          public_id,
          id_archivo,
          nombre,
          slug,
          afecta_caja,
          orden,
          fisico,
          activo,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?,
          ?,
          NULL,
          ?,
          ?,
          1,
          ?,
          1,
          1,
          ?,
          ?,
          NULL
        )
      `,
      [
        paymentTypeId,
        this.publicIdFactory.create(command.sourceHash, 'tipo_pago', 'efectivo'),
        CASH_PAYMENT_TYPE_NAME,
        CASH_PAYMENT_TYPE_SLUG,
        order,
        command.startedAt,
        command.startedAt,
      ],
    );

    /*
     * No es una anomalía del paquete. El efectivo
     * estaba implícito en el modelo legacy y ahora
     * necesita una fila explícita.
     */
    counters.importedRows++;

    return paymentTypeId;
  }

  private normalizeCashRegisters(
    cashRegisters: readonly LegacyCashRegisterRow[],
    cashMovements: readonly LegacyCashMovementRow[],
    command: LegacyImportExecutionCommand,

    counters: MutableImportCounters,
  ): readonly NormalizedCashRegister[] {
    if (cashRegisters.length === 0) {
      counters.warningCount++;

      const firstMovementDate: string | undefined = [...cashMovements].sort(
        (first: LegacyCashMovementRow, second: LegacyCashMovementRow): number =>
          first.createdAt.localeCompare(second.createdAt),
      )[0]?.createdAt;

      const syntheticCashRegister: LegacyCashRegisterRow = {
        id: 1,
        opening: firstMovementDate ?? command.startedAt,
        closing: null,
        sales: 0,
        profit: 0,
        cashSales: 0,
        cashOperations: 0,
        cashDiscount: 0,
        otherDiscount: 0,
        cashPaymentsAmount: 0,
        openingAmount: 0,
        closingAmount: 0,
        realClosingAmount: 0,
        withdrawnAmount: 0,
        inputAmount: 0,
        denominations: [],
        createdAt: firstMovementDate ?? command.startedAt,
        updatedAt: firstMovementDate ?? command.startedAt,
      };

      return [
        {
          source: syntheticCashRegister,
          closing: null,
        },
      ];
    }

    const usedIds: Set<number> = new Set<number>();

    const sortedCashRegisters: readonly LegacyCashRegisterRow[] = [...cashRegisters].sort(
      (first: LegacyCashRegisterRow, second: LegacyCashRegisterRow): number =>
        first.opening.localeCompare(second.opening) || first.id - second.id,
    );

    for (const cashRegister of sortedCashRegisters) {
      if (usedIds.has(cashRegister.id)) {
        throw new Error(`La tabla caja contiene el identificador duplicado ${cashRegister.id}.`);
      }

      usedIds.add(cashRegister.id);
    }

    return sortedCashRegisters.map(
      (cashRegister: LegacyCashRegisterRow, index: number): NormalizedCashRegister => {
        const nextCashRegister: LegacyCashRegisterRow | undefined = sortedCashRegisters[index + 1];

        let closing: string | null = cashRegister.closing;

        if (closing !== null && closing < cashRegister.opening) {
          closing = null;

          counters.warningCount++;
        }

        if (nextCashRegister !== undefined) {
          if (closing === null || closing > nextCashRegister.opening) {
            closing = nextCashRegister.opening;

            counters.warningCount++;
          }
        }

        return {
          source: cashRegister,
          closing,
        };
      },
    );
  }

  private async insertCashRegisters(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    cashRegisters: readonly NormalizedCashRegister[],
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const cashRegister of cashRegisters) {
      const source: LegacyCashRegisterRow = cashRegister.source;

      const discounts: number = this.normalizeNonNegativeAmount(
        source.cashDiscount + source.otherDiscount,
        counters,
      );

      await queryRunner.query(
        `
          INSERT INTO caja (
            id,
            public_id,
            id_terminal,
            id_empleado_apertura,
            id_empleado_cierre,
            apertura,
            cierre,
            ventas_cents,
            beneficios_cents,
            descuentos_cents,
            movimientos_entrada_cents,
            movimientos_salida_cents,
            importe_apertura_cents,
            importe_cierre_teorico_cents,
            importe_cierre_real_cents,
            importe_retirado_cents,
            observaciones,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            1,
            NULL,
            NULL,
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
          source.id,
          this.publicIdFactory.create(command.sourceHash, 'caja', source.id),
          source.opening,
          cashRegister.closing,
          this.numberConverter.toCents(source.sales, `caja ${source.id}.ventas`),
          this.numberConverter.toCents(source.profit, `caja ${source.id}.beneficios`),
          this.numberConverter.toCents(discounts, `caja ${source.id}.descuentos`),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.inputAmount, counters),
            `caja ${source.id}.importe_entrada`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.cashPaymentsAmount, counters),
            `caja ${source.id}.importe_pagos_caja`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.openingAmount, counters),
            `caja ${source.id}.importe_apertura`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.closingAmount, counters),
            `caja ${source.id}.importe_cierre`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.realClosingAmount, counters),
            `caja ${source.id}.importe_cierre_real`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.withdrawnAmount, counters),
            `caja ${source.id}.importe_retirado`,
          ),
          'Caja reconstruida desde Osumi TPV legacy.',
          source.createdAt,
          source.updatedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertCashBreakdowns(
    queryRunner: QueryRunner,
    cashRegisters: readonly NormalizedCashRegister[],
    cashTypes: readonly LegacyCashTypeRow[],
    cashPaymentTypeId: number,
    counters: MutableImportCounters,
  ): Promise<void> {
    const validCashRegisterIds: ReadonlySet<number> = new Set<number>(
      cashRegisters.map((cashRegister: NormalizedCashRegister): number => cashRegister.source.id),
    );

    const paymentTypeIds: ReadonlySet<number> = await this.readPaymentTypeIds(queryRunner);

    const legacyKeys: Set<string> = new Set<string>(
      cashTypes.map((cashType: LegacyCashTypeRow): string =>
        this.createCashTypeKey(cashType.cashRegisterId, cashType.paymentTypeId),
      ),
    );

    /*
     * El efectivo no era una fila de caja_tipo en el
     * modelo antiguo. Se genera a partir de las columnas
     * venta_efectivo, operaciones_efectivo y
     * descuento_efectivo de caja.
     */
    for (const cashRegister of cashRegisters) {
      const source: LegacyCashRegisterRow = cashRegister.source;

      const key: string = this.createCashTypeKey(source.id, cashPaymentTypeId);

      if (legacyKeys.has(key)) {
        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO caja_tipo (
            id_caja,
            id_tipo_pago,
            operaciones,
            importe_total_cents,
            importe_real_cents,
            importe_descuento_cents,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?
          )
        `,
        [
          source.id,
          cashPaymentTypeId,

          this.normalizeNonNegativeInteger(source.cashOperations, counters),

          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.cashSales, counters),
            `caja ${source.id}.venta_efectivo`,
          ),

          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(source.cashDiscount, counters),
            `caja ${source.id}.descuento_efectivo`,
          ),

          source.createdAt,
          source.updatedAt,
        ],
      );

      counters.importedRows++;
    }

    const insertedKeys: Set<string> = new Set<string>();

    for (const cashType of cashTypes) {
      const key: string = this.createCashTypeKey(cashType.cashRegisterId, cashType.paymentTypeId);

      if (insertedKeys.has(key)) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      if (
        !validCashRegisterIds.has(cashType.cashRegisterId) ||
        !paymentTypeIds.has(cashType.paymentTypeId)
      ) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO caja_tipo (
            id_caja,
            id_tipo_pago,
            operaciones,
            importe_total_cents,
            importe_real_cents,
            importe_descuento_cents,
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
          cashType.cashRegisterId,
          cashType.paymentTypeId,
          this.normalizeNonNegativeInteger(cashType.operations, counters),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(cashType.total ?? 0, counters),
            ['caja_tipo', cashType.cashRegisterId, cashType.paymentTypeId, 'importe_total'].join(
              '.',
            ),
          ),
          cashType.realTotal === null
            ? null
            : this.numberConverter.toCents(
                this.normalizeNonNegativeAmount(cashType.realTotal, counters),
                ['caja_tipo', cashType.cashRegisterId, cashType.paymentTypeId, 'importe_real'].join(
                  '.',
                ),
              ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeAmount(cashType.discountAmount ?? 0, counters),
            [
              'caja_tipo',
              cashType.cashRegisterId,
              cashType.paymentTypeId,
              'importe_descuento',
            ].join('.'),
          ),
          cashType.createdAt,
          cashType.updatedAt,
        ],
      );

      insertedKeys.add(key);

      counters.importedRows++;
    }
  }

  private async insertCashCounts(
    queryRunner: QueryRunner,
    cashRegisters: readonly NormalizedCashRegister[],
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const cashRegister of cashRegisters) {
      for (const denomination of cashRegister.source.denominations) {
        let quantity: number = denomination.quantity;

        if (quantity < 0) {
          quantity = 0;

          counters.warningCount++;
        }

        if (quantity === 0) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO caja_recuento (
              id_caja,
              momento,
              valor_centimos,
              cantidad,
              created_at
            )
            VALUES (
              ?,
              'cierre',
              ?,
              ?,
              ?
            )
          `,
          [
            cashRegister.source.id,
            denomination.valueCents,
            quantity,
            cashRegister.closing ?? cashRegister.source.updatedAt,
          ],
        );

        counters.importedRows++;
      }
    }
  }

  private async insertCashMovements(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    cashRegisters: readonly NormalizedCashRegister[],
    cashMovements: readonly LegacyCashMovementRow[],
    counters: MutableImportCounters,
  ): Promise<void> {
    const sortedMovements: readonly LegacyCashMovementRow[] = [...cashMovements].sort(
      (first: LegacyCashMovementRow, second: LegacyCashMovementRow): number =>
        first.createdAt.localeCompare(second.createdAt) || first.id - second.id,
    );

    for (const cashMovement of sortedMovements) {
      if (cashMovement.amount <= 0) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      const resolution: CashRegisterResolution = this.resolveCashRegister(
        cashRegisters,
        cashMovement.createdAt,
      );

      if (!resolution.exact) {
        counters.warningCount++;
      }

      await queryRunner.query(
        `
          INSERT INTO movimiento_caja (
            id,
            public_id,
            id_caja,
            id_empleado,
            tipo,
            concepto,
            importe_cents,
            descripcion,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            NULL,
            'salida',
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL
          )
        `,
        [
          cashMovement.id,
          this.publicIdFactory.create(command.sourceHash, 'movimiento_caja', cashMovement.id),
          resolution.cashRegisterId,
          this.normalizeRequiredText(
            cashMovement.concept,
            `Movimiento legacy ${cashMovement.id}`,
            250,
            counters,
          ),
          this.numberConverter.toCents(cashMovement.amount, `pago_caja ${cashMovement.id}.importe`),
          this.normalizeOptionalText(cashMovement.description),
          cashMovement.createdAt,
          cashMovement.updatedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private resolveCashRegister(
    cashRegisters: readonly NormalizedCashRegister[],
    date: string,
  ): CashRegisterResolution {
    const exactCashRegisters: readonly NormalizedCashRegister[] = cashRegisters.filter(
      (cashRegister: NormalizedCashRegister): boolean =>
        cashRegister.source.opening <= date &&
        (cashRegister.closing === null || date <= cashRegister.closing),
    );

    const exactCashRegister: NormalizedCashRegister | undefined =
      exactCashRegisters[exactCashRegisters.length - 1];

    if (exactCashRegister !== undefined) {
      return {
        cashRegisterId: exactCashRegister.source.id,
        exact: true,
      };
    }

    const previousCashRegisters: readonly NormalizedCashRegister[] = cashRegisters.filter(
      (cashRegister: NormalizedCashRegister): boolean => cashRegister.source.opening <= date,
    );

    const previousCashRegister: NormalizedCashRegister | undefined =
      previousCashRegisters[previousCashRegisters.length - 1];

    if (previousCashRegister !== undefined) {
      return {
        cashRegisterId: previousCashRegister.source.id,
        exact: false,
      };
    }

    const firstCashRegister: NormalizedCashRegister | undefined = cashRegisters[0];

    if (firstCashRegister === undefined) {
      throw new Error('No existe ninguna caja a la que asociar el movimiento.');
    }

    return {
      cashRegisterId: firstCashRegister.source.id,

      exact: false,
    };
  }

  private async readPaymentTypeIds(queryRunner: QueryRunner): Promise<ReadonlySet<number>> {
    const rows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM tipo_pago
          `,
    )) as readonly IdRow[];

    return new Set<number>(rows.map((row: IdRow): number => row.id));
  }

  private createCashTypeKey(cashRegisterId: number, paymentTypeId: number): string {
    return [cashRegisterId, paymentTypeId].join(':');
  }

  private normalizeNonNegativeAmount(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizeNonNegativeInteger(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizeRequiredText(
    value: string,
    fallback: string,
    maximumLength: number,
    counters: MutableImportCounters,
  ): string {
    let normalized: string = value.trim();

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

  private normalizeOptionalText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized: string = value.trim();

    return normalized.length === 0 ? null : normalized;
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
