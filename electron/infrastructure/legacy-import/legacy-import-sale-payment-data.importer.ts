import type LegacyImportDumpReader from '@backend/contracts/legacy-import-dump-reader.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import type { QueryRunner } from 'typeorm';

interface LegacySalePaymentRow {
  readonly id: number;

  readonly saleNumber: number;

  readonly total: number;

  readonly delivered: number;

  readonly mixedPayment: boolean;

  readonly paymentTypeId: number | null;

  readonly deliveredOther: number | null;

  readonly resultingBalance: number | null;

  readonly invoiced: boolean;

  readonly ticketBaiFingerprint: string | null;

  readonly ticketBaiQr: string | null;

  readonly ticketBaiUrl: string | null;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

interface LegacyInvoiceSaleRow {
  readonly invoiceId: number;

  readonly saleId: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MutableSalePaymentDataState {
  readonly sales: LegacySalePaymentRow[];

  readonly invoiceSales: LegacyInvoiceSaleRow[];
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

interface SaleDatabaseRow {
  readonly id: number;

  readonly total_cents: number;

  readonly created_at: string;

  readonly updated_at: string;

  readonly deleted_at: string | null;
}

interface PaymentTypeDatabaseRow {
  readonly id: number;

  readonly slug: string;
}

interface IdRow {
  readonly id: number;
}

interface DeliveredResolution {
  readonly deliveredCents: number;

  readonly preserveZero: boolean;
}

interface SalePaymentDraft {
  readonly paymentTypeId: number;

  readonly amountCents: number;

  readonly deliveredCents: number | null;

  readonly changeCents: number;

  readonly resultingBalanceCents: number | null;
}

type SaleDeliveredDecision = Extract<
  LegacyImportReviewDecision,
  {
    readonly code: 'anomalous-sale-delivered-amounts';
  }
>;

const SALE_PAYMENT_DATA_TABLES: readonly string[] = ['venta', 'factura_venta'];

const CASH_PAYMENT_TYPE_SLUG: string = 'efectivo';

const MAXIMUM_REASONABLE_DELIVERED_AMOUNT: number = 1_000_000;

export default class LegacyImportSalePaymentDataImporter implements LegacyImportPhaseImporter {
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
      'reading-sale-payment-data',
      99,
      'Leyendo pagos, TicketBAI y relaciones con facturas…',
    );

    const state: MutableSalePaymentDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      SALE_PAYMENT_DATA_TABLES,
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
      const salesById: ReadonlyMap<number, SaleDatabaseRow> = await this.readSalesById(queryRunner);

      const paymentTypes: readonly PaymentTypeDatabaseRow[] =
        await this.readPaymentTypes(queryRunner);

      const paymentTypeIds: ReadonlySet<number> = new Set<number>(
        paymentTypes.map((paymentType: PaymentTypeDatabaseRow): number => paymentType.id),
      );

      const cashPaymentTypeId: number = this.getCashPaymentTypeId(paymentTypes);

      const invoiceIds: ReadonlySet<number> = await this.readInvoiceIds(queryRunner);

      const decisionsById: ReadonlyMap<string, LegacyImportReviewDecision> = this.createDecisionMap(
        command.reviewDecisions,
      );

      this.assertAllSalesWereImported(state.sales, salesById);

      this.reportProgress(
        command,
        progressListener,
        'importing-sale-payments',
        99,
        'Reconstruyendo los pagos de las ventas…',
      );

      await this.insertSalePayments(
        queryRunner,
        command,
        state.sales,
        salesById,
        paymentTypeIds,
        cashPaymentTypeId,
        decisionsById,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-ticketbai',
        99,
        'Importando la información histórica de TicketBAI…',
      );

      await this.insertTicketBai(queryRunner, state.sales, salesById, counters);

      this.reportProgress(
        command,
        progressListener,
        'linking-invoice-sales',
        99,
        'Relacionando facturas y ventas…',
      );

      await this.insertInvoiceSales(
        queryRunner,
        state.sales,
        state.invoiceSales,
        salesById,
        invoiceIds,
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

      throw new Error(
        ['No se han podido importar los pagos,', 'TicketBAI y las relaciones de facturación.'].join(
          ' ',
        ),
        {
          cause: error,
        },
      );
    }
  }

  private createState(): MutableSalePaymentDataState {
    return {
      sales: [],
      invoiceSales: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: MutableSalePaymentDataState): void {
    switch (insert.tableName) {
      case 'venta':
        state.sales.push(this.readSale(insert));

        return;

      case 'factura_venta':
        state.invoiceSales.push(this.readInvoiceSale(insert));

        return;
    }
  }

  private readSale(insert: LegacySqlInsert): LegacySalePaymentRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      saleNumber: this.valueReader.getRequiredInteger(insert, 'num_venta'),
      total: this.valueReader.getRequiredNumber(insert, 'total'),
      delivered: this.valueReader.getRequiredNumber(insert, 'entregado'),
      mixedPayment: this.valueReader.getRequiredBoolean(insert, 'pago_mixto'),
      paymentTypeId: this.valueReader.getOptionalInteger(insert, 'id_tipo_pago'),
      deliveredOther: this.valueReader.getOptionalNumber(insert, 'entregado_otro'),
      resultingBalance: this.valueReader.getOptionalNumber(insert, 'saldo'),
      invoiced: this.valueReader.getRequiredBoolean(insert, 'facturada'),
      ticketBaiFingerprint: this.valueReader.getOptionalText(insert, 'tbai_huella'),
      ticketBaiQr: this.valueReader.getOptionalText(insert, 'tbai_qr'),
      ticketBaiUrl: this.valueReader.getOptionalText(insert, 'tbai_url'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readInvoiceSale(insert: LegacySqlInsert): LegacyInvoiceSaleRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      invoiceId: this.valueReader.getRequiredInteger(insert, 'id_factura'),
      saleId: this.valueReader.getRequiredInteger(insert, 'id_venta'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private async insertSalePayments(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    sales: readonly LegacySalePaymentRow[],
    salesById: ReadonlyMap<number, SaleDatabaseRow>,
    paymentTypeIds: ReadonlySet<number>,
    cashPaymentTypeId: number,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedSaleIds: Set<number> = new Set<number>();

    const sortedSales: readonly LegacySalePaymentRow[] = [...sales].sort(
      (first: LegacySalePaymentRow, second: LegacySalePaymentRow): number => first.id - second.id,
    );

    for (const sale of sortedSales) {
      if (insertedSaleIds.has(sale.id)) {
        throw new Error(`La tabla venta contiene el identificador duplicado ${sale.id}.`);
      }

      insertedSaleIds.add(sale.id);

      const databaseSale: SaleDatabaseRow | undefined = salesById.get(sale.id);

      if (databaseSale === undefined) {
        throw new Error(`La venta ${sale.id} no existe en la base temporal.`);
      }

      const payments: readonly SalePaymentDraft[] = this.createSalePayments(
        sale,
        databaseSale,
        paymentTypeIds,
        cashPaymentTypeId,
        decisionsById,
        counters,
      );

      this.assertPaymentTotal(sale.id, databaseSale.total_cents, payments);

      for (let order: number = 0; order < payments.length; order++) {
        const payment: SalePaymentDraft | undefined = payments[order];

        if (payment === undefined) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO venta_pago (
              public_id,
              id_venta,
              id_tipo_pago,
              orden,
              importe_cents,
              entregado_cents,
              cambio_cents,
              saldo_resultante_cents,
              referencia,
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
              NULL,
              ?,
              ?
            )
          `,
          [
            this.publicIdFactory.create(command.sourceHash, 'venta_pago', `${sale.id}:${order}`),
            sale.id,
            payment.paymentTypeId,
            order,
            payment.amountCents,
            payment.deliveredCents,
            payment.changeCents,
            payment.resultingBalanceCents,
            sale.createdAt,
            sale.updatedAt,
          ],
        );

        counters.importedRows++;
      }
    }
  }

  private createSalePayments(
    sale: LegacySalePaymentRow,
    databaseSale: SaleDatabaseRow,
    paymentTypeIds: ReadonlySet<number>,
    cashPaymentTypeId: number,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    counters: MutableImportCounters,
  ): readonly SalePaymentDraft[] {
    const totalCents: number = databaseSale.total_cents;

    const resultingBalanceCents: number | null =
      sale.resultingBalance === null
        ? null
        : this.numberConverter.toCents(sale.resultingBalance, `venta ${sale.id}.saldo`);

    const alternativePaymentTypeId: number | null = this.resolveAlternativePaymentTypeId(
      sale,
      paymentTypeIds,
      cashPaymentTypeId,
      counters,
    );

    const deliveredResolution: DeliveredResolution = this.resolveDeliveredAmount(
      sale,
      totalCents,
      decisionsById,
      counters,
    );

    /*
     * Para devoluciones completas o ventas de importe
     * cero no intentamos dividir el pago. Se conserva
     * un único medio de pago con el importe exacto.
     */
    if (totalCents <= 0) {
      return [
        {
          paymentTypeId: alternativePaymentTypeId ?? cashPaymentTypeId,
          amountCents: totalCents,
          deliveredCents: null,
          changeCents: 0,
          resultingBalanceCents,
        },
      ];
    }

    if (sale.mixedPayment && alternativePaymentTypeId !== null) {
      return this.createMixedPayments(
        sale,
        totalCents,
        alternativePaymentTypeId,
        cashPaymentTypeId,
        deliveredResolution,
        resultingBalanceCents,
        counters,
      );
    }

    if (sale.mixedPayment && alternativePaymentTypeId === null) {
      counters.warningCount++;
    }

    if (alternativePaymentTypeId !== null) {
      return [
        {
          paymentTypeId: alternativePaymentTypeId,
          amountCents: totalCents,
          deliveredCents: null,
          changeCents: 0,
          resultingBalanceCents,
        },
      ];
    }

    return [
      this.createCashPayment(
        cashPaymentTypeId,
        totalCents,
        deliveredResolution,
        resultingBalanceCents,
        counters,
      ),
    ];
  }

  private createMixedPayments(
    sale: LegacySalePaymentRow,
    totalCents: number,
    alternativePaymentTypeId: number,
    cashPaymentTypeId: number,
    deliveredResolution: DeliveredResolution,
    resultingBalanceCents: number | null,
    counters: MutableImportCounters,
  ): readonly SalePaymentDraft[] {
    let alternativeAmountCents: number = this.numberConverter.toCents(
      this.normalizeNonNegativeNumber(sale.deliveredOther ?? 0, counters),

      `venta ${sale.id}.entregado_otro`,
    );

    if (alternativeAmountCents > totalCents) {
      alternativeAmountCents = totalCents;

      counters.warningCount++;
    }

    const cashAmountCents: number = totalCents - alternativeAmountCents;

    const payments: SalePaymentDraft[] = [];

    if (cashAmountCents > 0) {
      payments.push(
        this.createCashPayment(
          cashPaymentTypeId,
          cashAmountCents,
          deliveredResolution,
          alternativeAmountCents > 0 ? null : resultingBalanceCents,
          counters,
        ),
      );
    }

    if (alternativeAmountCents > 0) {
      payments.push({
        paymentTypeId: alternativePaymentTypeId,
        amountCents: alternativeAmountCents,
        deliveredCents: null,
        changeCents: 0,
        resultingBalanceCents,
      });
    }

    /*
     * Una venta marcada como mixta pero con una de
     * las dos partes a cero se conserva correctamente,
     * aunque la inconsistencia queda como advertencia.
     */
    if (payments.length === 1) {
      counters.warningCount++;
    }

    if (payments.length === 0) {
      counters.warningCount++;

      return [
        this.createCashPayment(
          cashPaymentTypeId,
          totalCents,
          deliveredResolution,
          resultingBalanceCents,
          counters,
        ),
      ];
    }

    return payments;
  }

  private createCashPayment(
    cashPaymentTypeId: number,
    amountCents: number,
    deliveredResolution: DeliveredResolution,
    resultingBalanceCents: number | null,
    counters: MutableImportCounters,
  ): SalePaymentDraft {
    let deliveredCents: number = deliveredResolution.deliveredCents;

    if (deliveredCents <= 0 && amountCents > 0 && !deliveredResolution.preserveZero) {
      deliveredCents = amountCents;

      counters.warningCount++;
    }

    if (deliveredCents > 0 && deliveredCents < amountCents && !deliveredResolution.preserveZero) {
      deliveredCents = amountCents;

      counters.warningCount++;
    }

    const changeCents: number = deliveredCents > amountCents ? deliveredCents - amountCents : 0;

    return {
      paymentTypeId: cashPaymentTypeId,
      amountCents,
      deliveredCents,
      changeCents,
      resultingBalanceCents,
    };
  }

  private resolveAlternativePaymentTypeId(
    sale: LegacySalePaymentRow,
    paymentTypeIds: ReadonlySet<number>,
    cashPaymentTypeId: number,
    counters: MutableImportCounters,
  ): number | null {
    if (sale.paymentTypeId === null) {
      return null;
    }

    if (sale.paymentTypeId === cashPaymentTypeId) {
      return null;
    }

    if (!paymentTypeIds.has(sale.paymentTypeId)) {
      counters.warningCount++;

      return null;
    }

    return sale.paymentTypeId;
  }

  private resolveDeliveredAmount(
    sale: LegacySalePaymentRow,
    totalCents: number,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    counters: MutableImportCounters,
  ): DeliveredResolution {
    if (sale.delivered > MAXIMUM_REASONABLE_DELIVERED_AMOUNT) {
      const conflictId: string = `sale-delivered:${sale.id}`;

      const decision: SaleDeliveredDecision = this.getRequiredDeliveredDecision(
        conflictId,
        decisionsById,
      );

      counters.warningCount++;

      switch (decision.action) {
        case 'use-sale-total':
          return {
            deliveredCents: Math.max(0, totalCents),
            preserveZero: false,
          };

        case 'use-zero':
          return {
            deliveredCents: 0,
            preserveZero: true,
          };
      }
    }

    if (sale.delivered < 0) {
      counters.warningCount++;

      return {
        deliveredCents: 0,
        preserveZero: false,
      };
    }

    return {
      deliveredCents: this.numberConverter.toCents(sale.delivered, `venta ${sale.id}.entregado`),
      preserveZero: false,
    };
  }

  private getRequiredDeliveredDecision(
    conflictId: string,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
  ): SaleDeliveredDecision {
    const decision: LegacyImportReviewDecision | undefined = decisionsById.get(conflictId);

    if (decision === undefined || decision.code !== 'anomalous-sale-delivered-amounts') {
      throw new Error(
        ['No existe una decisión válida', `para el importe entregado de ${conflictId}.`].join(' '),
      );
    }

    return decision;
  }

  private assertPaymentTotal(
    saleId: number,
    expectedTotalCents: number,
    payments: readonly SalePaymentDraft[],
  ): void {
    if (payments.length === 0) {
      throw new Error(`La venta ${saleId} no ha generado ningún pago.`);
    }

    const paymentTotalCents: number = payments.reduce(
      (total: number, payment: SalePaymentDraft): number => total + payment.amountCents,

      0,
    );

    if (paymentTotalCents !== expectedTotalCents) {
      throw new Error(
        [
          `Los pagos de la venta ${saleId}`,
          `suman ${paymentTotalCents} céntimos`,
          `pero la venta tiene ${expectedTotalCents}.`,
        ].join(' '),
      );
    }
  }

  private async insertTicketBai(
    queryRunner: QueryRunner,
    sales: readonly LegacySalePaymentRow[],
    salesById: ReadonlyMap<number, SaleDatabaseRow>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const sortedSales: readonly LegacySalePaymentRow[] = [...sales].sort(
      (first: LegacySalePaymentRow, second: LegacySalePaymentRow): number => first.id - second.id,
    );

    for (const sale of sortedSales) {
      const databaseSale: SaleDatabaseRow | undefined = salesById.get(sale.id);

      if (databaseSale === undefined) {
        throw new Error(`No se puede registrar TicketBAI para la venta inexistente ${sale.id}.`);
      }

      const fingerprint: string | null = this.normalizeOptionalText(sale.ticketBaiFingerprint);

      const qr: string | null = this.normalizeOptionalText(sale.ticketBaiQr);

      const url: string | null = this.normalizeOptionalText(sale.ticketBaiUrl);

      const hasTicketBaiData: boolean = fingerprint !== null || qr !== null || url !== null;

      const status: 'legacy' | 'no_aplica' = hasTicketBaiData ? 'legacy' : 'no_aplica';

      await queryRunner.query(
        `
          INSERT INTO venta_ticketbai (
            id_venta,
            estado,
            identificador,
            huella,
            qr,
            url,
            intentos,
            ultimo_error,
            solicitud_payload,
            respuesta_payload,
            enviado_at,
            aceptado_at,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?,
            0,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            ?,
            ?
          )
        `,
        [sale.id, status, fingerprint, qr, url, databaseSale.created_at, databaseSale.updated_at],
      );

      counters.importedRows++;
    }
  }

  private async insertInvoiceSales(
    queryRunner: QueryRunner,
    sales: readonly LegacySalePaymentRow[],
    invoiceSales: readonly LegacyInvoiceSaleRow[],
    salesById: ReadonlyMap<number, SaleDatabaseRow>,
    invoiceIds: ReadonlySet<number>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const invoiceOwnerBySale: Map<number, number> = new Map<number, number>();

    const insertedRelations: Set<string> = new Set<string>();

    const relatedSaleIds: Set<number> = new Set<number>();

    const sortedRelations: readonly LegacyInvoiceSaleRow[] = [...invoiceSales].sort(
      (first: LegacyInvoiceSaleRow, second: LegacyInvoiceSaleRow): number =>
        first.invoiceId - second.invoiceId || first.saleId - second.saleId,
    );

    for (const relation of sortedRelations) {
      if (!invoiceIds.has(relation.invoiceId)) {
        throw new Error(
          [
            `La relación factura_venta`,
            `referencia la factura inexistente ${relation.invoiceId}.`,
          ].join(' '),
        );
      }

      if (!salesById.has(relation.saleId)) {
        throw new Error(
          [`La relación factura_venta`, `referencia la venta inexistente ${relation.saleId}.`].join(
            ' ',
          ),
        );
      }

      const relationKey: string = [relation.invoiceId, relation.saleId].join(':');

      if (insertedRelations.has(relationKey)) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      const existingInvoiceId: number | undefined = invoiceOwnerBySale.get(relation.saleId);

      if (existingInvoiceId !== undefined && existingInvoiceId !== relation.invoiceId) {
        throw new Error(
          [
            `La venta ${relation.saleId}`,
            `está asociada a las facturas`,
            `${existingInvoiceId} y ${relation.invoiceId}.`,
          ].join(' '),
        );
      }

      await queryRunner.query(
        `
          INSERT INTO factura_venta (
            id_factura,
            id_venta,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `,
        [relation.invoiceId, relation.saleId, relation.createdAt, relation.updatedAt],
      );

      insertedRelations.add(relationKey);

      invoiceOwnerBySale.set(relation.saleId, relation.invoiceId);

      relatedSaleIds.add(relation.saleId);

      counters.importedRows++;
    }

    /*
     * En el modelo nuevo la relación es la fuente de
     * verdad. El booleano legacy solo se usa para
     * detectar inconsistencias.
     */
    for (const sale of sales) {
      const hasInvoiceRelation: boolean = relatedSaleIds.has(sale.id);

      if (sale.invoiced !== hasInvoiceRelation) {
        counters.warningCount++;
      }
    }
  }

  private async readSalesById(
    queryRunner: QueryRunner,
  ): Promise<ReadonlyMap<number, SaleDatabaseRow>> {
    const rows: readonly SaleDatabaseRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              total_cents,
              created_at,
              updated_at,
              deleted_at
            FROM venta
          `,
    )) as readonly SaleDatabaseRow[];

    return new Map<number, SaleDatabaseRow>(
      rows.map((row: SaleDatabaseRow): [number, SaleDatabaseRow] => [row.id, row]),
    );
  }

  private async readPaymentTypes(
    queryRunner: QueryRunner,
  ): Promise<readonly PaymentTypeDatabaseRow[]> {
    return (await queryRunner.query(
      `
        SELECT
          id,
          slug
        FROM tipo_pago
      `,
    )) as readonly PaymentTypeDatabaseRow[];
  }

  private getCashPaymentTypeId(paymentTypes: readonly PaymentTypeDatabaseRow[]): number {
    const cashPaymentType: PaymentTypeDatabaseRow | undefined = paymentTypes.find(
      (paymentType: PaymentTypeDatabaseRow): boolean =>
        paymentType.slug.trim().toLocaleLowerCase('es-ES') === CASH_PAYMENT_TYPE_SLUG,
    );

    if (cashPaymentType === undefined) {
      throw new Error(
        [
          'No existe el tipo de pago Efectivo.',
          'Debe importarse antes de reconstruir los pagos.',
        ].join(' '),
      );
    }

    return cashPaymentType.id;
  }

  private async readInvoiceIds(queryRunner: QueryRunner): Promise<ReadonlySet<number>> {
    const rows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM factura
          `,
    )) as readonly IdRow[];

    return new Set<number>(rows.map((row: IdRow): number => row.id));
  }

  private assertAllSalesWereImported(
    sourceSales: readonly LegacySalePaymentRow[],
    salesById: ReadonlyMap<number, SaleDatabaseRow>,
  ): void {
    if (sourceSales.length !== salesById.size) {
      throw new Error(
        ['El número de ventas legacy', 'no coincide con las ventas de la base temporal.'].join(' '),
      );
    }

    for (const sale of sourceSales) {
      if (!salesById.has(sale.id)) {
        throw new Error(`La venta legacy ${sale.id} no fue importada previamente.`);
      }
    }
  }

  private createDecisionMap(
    decisions: readonly LegacyImportReviewDecision[],
  ): ReadonlyMap<string, LegacyImportReviewDecision> {
    return new Map<string, LegacyImportReviewDecision>(
      decisions.map(
        (decision: LegacyImportReviewDecision): [string, LegacyImportReviewDecision] => [
          decision.conflictId,
          decision,
        ],
      ),
    );
  }

  private normalizeNonNegativeNumber(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
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
