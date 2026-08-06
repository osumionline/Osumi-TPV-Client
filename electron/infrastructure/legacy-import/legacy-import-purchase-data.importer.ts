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

type OrderType = 'albaran' | 'factura' | 'abono';

interface LegacyOrderRow {
  readonly id: number;

  readonly providerId: number | null;

  readonly paymentMethod: number | null;

  readonly type: string | null;

  readonly number: string | null;

  readonly amount: number;

  readonly shippingAmount: number;

  readonly discount: number;

  readonly paymentDate: string | null;

  readonly orderDate: string | null;

  readonly receptionDate: string | null;

  readonly equivalenceSurcharge: boolean;

  readonly european: boolean;

  readonly missingItems: boolean;

  readonly received: boolean;

  readonly notes: string | null;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyOrderLineRow {
  readonly id: number;

  readonly orderId: number;

  readonly articleId: number | null;

  readonly articleName: string | null;

  readonly barcode: string | null;

  readonly units: number;

  readonly deliveryPrice: number;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly margin: number | null;

  readonly taxRate: number;

  readonly equivalenceSurcharge: number | null;

  readonly discount: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyOrderViewRow {
  readonly orderId: number;

  readonly columnId: number;

  readonly visible: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MutablePurchaseDataState {
  readonly orders: LegacyOrderRow[];

  readonly orderLines: LegacyOrderLineRow[];

  readonly orderViews: LegacyOrderViewRow[];
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

interface PaymentTypeRow {
  readonly id: number;

  readonly slug: string;
}

interface ArticleRow {
  readonly id: number;

  readonly nombre: string;
}

interface PurchaseReferences {
  readonly providerIds: Set<number>;

  readonly fallbackProviderId: number | null;

  readonly paymentTypeIds: ReadonlySet<number>;

  readonly cashPaymentTypeId: number | null;

  readonly articleNames: ReadonlyMap<number, string>;
}

interface NormalizedReception {
  readonly receptionDate: string | null;

  readonly received: boolean;
}

const PURCHASE_DATA_TABLES: readonly string[] = ['pedido', 'linea_pedido', 'vista_pedido'];

const CASH_PAYMENT_TYPE_SLUG: string = 'efectivo';

const FALLBACK_PROVIDER_NAME: string = 'Proveedor legacy desconocido';

export default class LegacyImportPurchaseDataImporter implements LegacyImportPhaseImporter {
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
      'reading-purchase-data',
      99,
      'Leyendo pedidos, líneas y configuración de columnas…',
    );

    const state: MutablePurchaseDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      PURCHASE_DATA_TABLES,
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
      const references: PurchaseReferences = await this.readReferences(
        queryRunner,
        command,
        state.orders,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-orders',
        99,
        'Importando pedidos de proveedores…',
      );

      const orderIds: ReadonlySet<number> = await this.insertOrders(
        queryRunner,
        command,
        state.orders,
        references,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-order-lines',
        99,
        'Importando líneas de pedido…',
      );

      await this.insertOrderLines(
        queryRunner,
        command,
        state.orderLines,
        orderIds,
        references.articleNames,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-order-views',
        99,
        'Importando la configuración de columnas…',
      );

      await this.insertOrderViews(queryRunner, state.orderViews, orderIds, counters);

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
        [
          'No se han podido importar los pedidos,',
          'sus líneas y la configuración de columnas.',
        ].join(' '),
        {
          cause: error,
        },
      );
    }
  }

  private createState(): MutablePurchaseDataState {
    return {
      orders: [],
      orderLines: [],
      orderViews: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: MutablePurchaseDataState): void {
    switch (insert.tableName) {
      case 'pedido':
        state.orders.push(this.readOrder(insert));

        return;

      case 'linea_pedido':
        state.orderLines.push(this.readOrderLine(insert));

        return;

      case 'vista_pedido':
        state.orderViews.push(this.readOrderView(insert));

        return;
    }
  }

  private readOrder(insert: LegacySqlInsert): LegacyOrderRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      providerId: this.valueReader.getOptionalInteger(insert, 'id_proveedor'),
      paymentMethod: this.valueReader.getOptionalInteger(insert, 'metodo_pago'),
      type: this.valueReader.getOptionalText(insert, 'tipo'),
      number: this.valueReader.getOptionalText(insert, 'num'),
      amount: this.valueReader.getRequiredNumber(insert, 'importe'),
      shippingAmount: this.valueReader.getRequiredNumber(insert, 'portes'),
      discount: this.valueReader.getRequiredNumber(insert, 'descuento'),
      paymentDate: this.valueReader.getOptionalText(insert, 'fecha_pago'),
      orderDate: this.valueReader.getOptionalText(insert, 'fecha_pedido'),
      receptionDate: this.valueReader.getOptionalText(insert, 'fecha_recepcionado'),
      equivalenceSurcharge: this.valueReader.getRequiredBoolean(insert, 're'),
      european: this.valueReader.getRequiredBoolean(insert, 'europeo'),
      missingItems: this.valueReader.getRequiredBoolean(insert, 'faltas'),
      received: this.valueReader.getRequiredBoolean(insert, 'recepcionado'),
      notes: this.valueReader.getOptionalText(insert, 'observaciones'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readOrderLine(insert: LegacySqlInsert): LegacyOrderLineRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      orderId: this.valueReader.getRequiredInteger(insert, 'id_pedido'),
      articleId: this.valueReader.getOptionalInteger(insert, 'id_articulo'),
      articleName: this.valueReader.getOptionalText(insert, 'nombre_articulo'),
      barcode: this.valueReader.getOptionalText(insert, 'codigo_barras'),
      units: this.valueReader.getRequiredInteger(insert, 'unidades'),
      deliveryPrice: this.valueReader.getRequiredNumber(insert, 'palb'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      margin: this.valueReader.getOptionalNumber(insert, 'margen'),
      taxRate: this.valueReader.getRequiredNumber(insert, 'iva'),
      equivalenceSurcharge: this.valueReader.getOptionalNumber(insert, 're'),
      discount: this.valueReader.getRequiredNumber(insert, 'descuento'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readOrderView(insert: LegacySqlInsert): LegacyOrderViewRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      orderId: this.valueReader.getRequiredInteger(insert, 'id_pedido'),
      columnId: this.valueReader.getRequiredInteger(insert, 'id_column'),
      visible: this.valueReader.getRequiredBoolean(insert, 'status'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private async insertOrders(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    orders: readonly LegacyOrderRow[],
    references: PurchaseReferences,
    counters: MutableImportCounters,
  ): Promise<ReadonlySet<number>> {
    const insertedOrderIds: Set<number> = new Set<number>();

    const sortedOrders: readonly LegacyOrderRow[] = [...orders].sort(
      (first: LegacyOrderRow, second: LegacyOrderRow): number => first.id - second.id,
    );

    for (const order of sortedOrders) {
      if (insertedOrderIds.has(order.id)) {
        throw new Error(`La tabla pedido contiene el identificador duplicado ${order.id}.`);
      }

      const providerId: number = this.resolveProviderId(order.providerId, references, counters);

      const paymentTypeId: number | null = this.resolvePaymentTypeId(
        order.paymentMethod,
        references,
        counters,
      );

      const type: OrderType = this.normalizeOrderType(order.type, counters);

      const normalizedReception: NormalizedReception = this.normalizeReception(order, counters);

      await queryRunner.query(
        `
          INSERT INTO pedido (
            id,
            public_id,
            id_proveedor,
            id_tipo_pago,
            tipo,
            numero,
            importe_micros,
            portes_micros,
            descuento_bps,
            fecha_pago,
            fecha_pedido,
            fecha_recepcionado,
            recargo_equivalencia,
            europeo,
            faltas,
            recepcionado,
            observaciones,
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
            NULL
          )
        `,
        [
          order.id,
          this.publicIdFactory.create(command.sourceHash, 'pedido', order.id),
          providerId,
          paymentTypeId,
          type,
          this.normalizeOptionalText(order.number, 200, counters),
          this.numberConverter.toMicros(
            this.normalizePurchaseAmount(order.amount, counters),
            `pedido ${order.id}.importe`,
          ),
          this.numberConverter.toMicros(
            this.normalizePurchaseAmount(order.shippingAmount, counters),
            `pedido ${order.id}.portes`,
          ),
          this.toBasisPoints(order.discount, `pedido ${order.id}.descuento`, counters),
          order.paymentDate,
          order.orderDate,
          normalizedReception.receptionDate,
          order.equivalenceSurcharge ? 1 : 0,
          order.european ? 1 : 0,
          order.missingItems ? 1 : 0,
          normalizedReception.received ? 1 : 0,
          this.normalizeOptionalText(order.notes, null, counters),
          order.createdAt,
          order.updatedAt,
        ],
      );

      insertedOrderIds.add(order.id);

      counters.importedRows++;
    }

    return insertedOrderIds;
  }

  private async insertOrderLines(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    orderLines: readonly LegacyOrderLineRow[],
    orderIds: ReadonlySet<number>,
    articleNames: ReadonlyMap<number, string>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedLineIds: Set<number> = new Set<number>();

    const sortedLines: readonly LegacyOrderLineRow[] = [...orderLines].sort(
      (first: LegacyOrderLineRow, second: LegacyOrderLineRow): number => first.id - second.id,
    );

    for (const line of sortedLines) {
      if (insertedLineIds.has(line.id)) {
        throw new Error(`La tabla linea_pedido contiene el identificador duplicado ${line.id}.`);
      }

      if (!orderIds.has(line.orderId)) {
        throw new Error(
          [
            `La línea de pedido ${line.id}`,
            `referencia el pedido inexistente ${line.orderId}.`,
          ].join(' '),
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

      const units: number = this.normalizeUnits(line.units, counters);

      await queryRunner.query(
        `
          INSERT INTO linea_pedido (
            id,
            public_id,
            id_pedido,
            id_articulo,
            nombre_articulo,
            codigo_barras,
            unidades,
            palb_micros,
            puc_micros,
            pvp_micros,
            margen_microporcentaje,
            iva_bps,
            recargo_equivalencia_bps,
            descuento_bps,
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
          this.publicIdFactory.create(command.sourceHash, 'linea_pedido', line.id),
          line.orderId,
          articleId,
          articleName,
          this.normalizeOptionalText(line.barcode, 100, counters),
          units,
          this.numberConverter.toMicros(
            this.normalizePurchaseAmount(line.deliveryPrice, counters),
            `linea_pedido ${line.id}.palb`,
          ),
          this.numberConverter.toMicros(
            this.normalizePurchaseAmount(line.purchasePrice, counters),
            `linea_pedido ${line.id}.puc`,
          ),
          this.numberConverter.toMicros(
            this.normalizePurchaseAmount(line.salePrice, counters),
            `linea_pedido ${line.id}.pvp`,
          ),

          this.numberConverter.toMicropercentage(
            line.margin ?? 0,
            `linea_pedido ${line.id}.margen`,
          ),
          this.toBasisPoints(line.taxRate, `linea_pedido ${line.id}.iva`, counters),
          this.toBasisPoints(
            line.equivalenceSurcharge ?? 0,
            `linea_pedido ${line.id}.re`,
            counters,
          ),
          this.toBasisPoints(line.discount, `linea_pedido ${line.id}.descuento`, counters),
          line.createdAt,
          line.updatedAt,
        ],
      );

      insertedLineIds.add(line.id);

      counters.importedRows++;
    }
  }

  private async insertOrderViews(
    queryRunner: QueryRunner,
    orderViews: readonly LegacyOrderViewRow[],
    orderIds: ReadonlySet<number>,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedKeys: Set<string> = new Set<string>();

    const sortedViews: readonly LegacyOrderViewRow[] = [...orderViews].sort(
      (first: LegacyOrderViewRow, second: LegacyOrderViewRow): number =>
        first.orderId - second.orderId || first.columnId - second.columnId,
    );

    for (const view of sortedViews) {
      if (!orderIds.has(view.orderId)) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      if (view.columnId <= 0) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      const key: string = [view.orderId, view.columnId].join(':');

      if (insertedKeys.has(key)) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO vista_pedido (
            id_pedido,
            id_columna,
            visible,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [view.orderId, view.columnId, view.visible ? 1 : 0, view.createdAt, view.updatedAt],
      );

      insertedKeys.add(key);

      counters.importedRows++;
    }
  }

  private async readReferences(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    orders: readonly LegacyOrderRow[],
    counters: MutableImportCounters,
  ): Promise<PurchaseReferences> {
    const providerIds: Set<number> = await this.readIdSet(queryRunner, 'proveedor');

    const fallbackProviderId: number | null = await this.ensureFallbackProvider(
      queryRunner,
      command,
      orders,
      providerIds,
    );

    if (fallbackProviderId !== null) {
      providerIds.add(fallbackProviderId);
    }

    const paymentTypes: readonly PaymentTypeRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              slug
            FROM tipo_pago
          `,
    )) as readonly PaymentTypeRow[];

    const cashPaymentType: PaymentTypeRow | undefined = paymentTypes.find(
      (paymentType: PaymentTypeRow): boolean =>
        paymentType.slug.trim().toLocaleLowerCase('es-ES') === CASH_PAYMENT_TYPE_SLUG,
    );

    const articleRows: readonly ArticleRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              nombre
            FROM articulo
          `,
    )) as readonly ArticleRow[];

    void counters;

    return {
      providerIds,
      fallbackProviderId,
      paymentTypeIds: new Set<number>(
        paymentTypes.map((paymentType: PaymentTypeRow): number => paymentType.id),
      ),
      cashPaymentTypeId: cashPaymentType?.id ?? null,
      articleNames: new Map<number, string>(
        articleRows.map((article: ArticleRow): [number, string] => [article.id, article.nombre]),
      ),
    };
  }

  private async ensureFallbackProvider(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    orders: readonly LegacyOrderRow[],
    providerIds: ReadonlySet<number>,
  ): Promise<number | null> {
    const requiresFallback: boolean = orders.some(
      (order: LegacyOrderRow): boolean =>
        order.providerId === null || !providerIds.has(order.providerId),
    );

    if (!requiresFallback) {
      return null;
    }

    const existingRows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM proveedor
            WHERE
              nombre = ?
                COLLATE NOCASE
              AND deleted_at IS NULL
            ORDER BY id
            LIMIT 1
          `,
      [FALLBACK_PROVIDER_NAME],
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
            FROM proveedor
          `,
    )) as readonly MaximumIdRow[];

    const fallbackProviderId: number = (maximumIdRows[0]?.maximumId ?? 0) + 1;

    await queryRunner.query(
      `
        INSERT INTO proveedor (
          id,
          public_id,
          id_archivo,
          nombre,
          direccion,
          telefono,
          email,
          web,
          observaciones,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?,
          ?,
          NULL,
          ?,
          NULL,
          NULL,
          NULL,
          NULL,
          ?,
          ?,
          ?,
          NULL
        )
      `,
      [
        fallbackProviderId,
        this.publicIdFactory.create(command.sourceHash, 'proveedor', 'legacy-desconocido'),
        FALLBACK_PROVIDER_NAME,
        ['Proveedor creado automáticamente', 'para pedidos legacy sin proveedor válido.'].join(' '),
        command.startedAt,
        command.startedAt,
      ],
    );

    return fallbackProviderId;
  }

  private resolveProviderId(
    providerId: number | null,
    references: PurchaseReferences,
    counters: MutableImportCounters,
  ): number {
    if (providerId !== null && references.providerIds.has(providerId)) {
      return providerId;
    }

    const fallbackProviderId: number | null = references.fallbackProviderId;

    if (fallbackProviderId === null) {
      throw new Error(
        ['No existe un proveedor válido', 'para completar un pedido legacy.'].join(' '),
      );
    }

    counters.warningCount++;

    return fallbackProviderId;
  }

  private resolvePaymentTypeId(
    paymentMethod: number | null,
    references: PurchaseReferences,
    counters: MutableImportCounters,
  ): number | null {
    if (paymentMethod === null) {
      return null;
    }

    if (paymentMethod === 0) {
      const cashPaymentTypeId: number | null = references.cashPaymentTypeId;

      if (cashPaymentTypeId === null) {
        throw new Error(
          ['Un pedido legacy utiliza efectivo,', 'pero no existe el tipo de pago Efectivo.'].join(
            ' ',
          ),
        );
      }

      return cashPaymentTypeId;
    }

    if (paymentMethod > 0 && references.paymentTypeIds.has(paymentMethod)) {
      return paymentMethod;
    }

    counters.warningCount++;

    return null;
  }

  private normalizeOrderType(value: string | null, counters: MutableImportCounters): OrderType {
    const normalized: string = value?.trim().toLocaleLowerCase('es-ES') ?? '';

    switch (normalized) {
      case 'albaran':
      case 'albarán':
        return 'albaran';

      case 'factura':
        return 'factura';

      case 'abono':
        return 'abono';

      default:
        counters.warningCount++;

        return 'factura';
    }
  }

  private normalizeReception(
    order: LegacyOrderRow,
    counters: MutableImportCounters,
  ): NormalizedReception {
    let receptionDate: string | null = order.receptionDate;

    let received: boolean = order.received || receptionDate !== null;

    if (receptionDate !== null && order.orderDate !== null && receptionDate < order.orderDate) {
      receptionDate = order.orderDate;

      counters.warningCount++;
    }

    if (received && receptionDate === null) {
      receptionDate = order.updatedAt;

      if (order.orderDate !== null && receptionDate < order.orderDate) {
        receptionDate = order.orderDate;
      }

      counters.warningCount++;
    }

    if (!received && receptionDate !== null) {
      received = true;

      counters.warningCount++;
    }

    return {
      receptionDate,
      received,
    };
  }

  private normalizeUnits(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return Math.abs(value);
  }

  private normalizePurchaseAmount(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    /*
     * En los abonos la dirección económica ya queda
     * representada por pedido.tipo. Los importes se
     * conservan como magnitud positiva.
     */
    counters.warningCount++;

    return Math.abs(value);
  }

  private toBasisPoints(
    percentage: number,
    fieldName: string,
    counters: MutableImportCounters,
  ): number {
    let normalized: number = percentage;

    if (normalized < 0) {
      normalized = 0;

      counters.warningCount++;
    } else if (normalized > 100) {
      normalized = 100;

      counters.warningCount++;
    }

    return this.numberConverter.toBasisPoints(normalized, fieldName);
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

  private normalizeOptionalText(
    value: string | null,
    maximumLength: number | null,
    counters: MutableImportCounters,
  ): string | null {
    if (value === null) {
      return null;
    }

    let normalized: string = value.trim();

    if (normalized.length === 0) {
      return null;
    }

    if (maximumLength !== null && normalized.length > maximumLength) {
      normalized = normalized.slice(0, maximumLength);

      counters.warningCount++;
    }

    return normalized;
  }

  private async readIdSet(queryRunner: QueryRunner, tableName: 'proveedor'): Promise<Set<number>> {
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
