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

interface LegacyCustomerRow {
  readonly id: number;

  readonly name: string;

  readonly document: string | null;

  readonly phone: string | null;

  readonly email: string | null;

  readonly address: string | null;

  readonly postalCode: string | null;

  readonly city: string | null;

  readonly provinceId: number | null;

  readonly sameBillingData: boolean;

  readonly billingName: string | null;

  readonly billingDocument: string | null;

  readonly billingPhone: string | null;

  readonly billingEmail: string | null;

  readonly billingAddress: string | null;

  readonly billingPostalCode: string | null;

  readonly billingCity: string | null;

  readonly billingProvinceId: number | null;

  readonly notes: string | null;

  readonly discount: number;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

interface LegacyReservationRow {
  readonly id: number;

  readonly customerId: number;

  readonly total: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyReservationLineRow {
  readonly id: number;

  readonly reservationId: number;

  readonly articleId: number | null;

  readonly articleName: string | null;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly taxRate: number;

  readonly total: number;

  readonly discount: number | null;

  readonly discountAmount: number | null;

  readonly units: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface LegacyInvoiceRow {
  readonly id: number;

  readonly customerId: number;

  readonly number: number | null;

  readonly name: string;

  readonly document: string | null;

  readonly phone: string | null;

  readonly email: string | null;

  readonly address: string | null;

  readonly postalCode: string | null;

  readonly city: string | null;

  readonly provinceId: number | null;

  readonly total: number;

  readonly printed: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

interface MutableCustomerDataState {
  readonly customers: LegacyCustomerRow[];

  readonly reservations: LegacyReservationRow[];

  readonly reservationLines: LegacyReservationLineRow[];

  readonly invoices: LegacyInvoiceRow[];
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

interface InsertedCustomers {
  readonly ids: ReadonlySet<number>;

  readonly namesById: ReadonlyMap<number, string>;
}

interface ArticleNameRow {
  readonly id: number;

  readonly nombre: string;
}

const CUSTOMER_DATA_TABLES: readonly string[] = ['cliente', 'reserva', 'linea_reserva', 'factura'];

export default class LegacyImportCustomerDataImporter implements LegacyImportPhaseImporter {
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
      'reading-customer-data',
      95,
      'Leyendo clientes, reservas y facturas…',
    );

    const state: MutableCustomerDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      CUSTOMER_DATA_TABLES,
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
      const articleNames: ReadonlyMap<number, string> = await this.readArticleNames(queryRunner);

      this.reportProgress(
        command,
        progressListener,
        'importing-customers',
        96,
        'Importando clientes…',
      );

      const insertedCustomers: InsertedCustomers = await this.insertCustomers(
        queryRunner,
        command,
        state.customers,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-reservations',
        97,
        'Importando reservas…',
      );

      const reservationIds: ReadonlySet<number> = await this.insertReservations(
        queryRunner,
        command,
        state.reservations,
        insertedCustomers.ids,
        counters,
      );

      await this.insertReservationLines(
        queryRunner,
        command,
        state.reservationLines,
        reservationIds,
        articleNames,
        counters,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-invoices',
        98,
        'Importando facturas…',
      );

      await this.insertInvoices(queryRunner, command, state.invoices, insertedCustomers, counters);

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

      throw new Error('No se han podido importar los clientes, reservas y facturas.', {
        cause: error,
      });
    }
  }

  private createState(): MutableCustomerDataState {
    return {
      customers: [],
      reservations: [],
      reservationLines: [],
      invoices: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: MutableCustomerDataState): void {
    switch (insert.tableName) {
      case 'cliente':
        state.customers.push(this.readCustomer(insert));

        return;

      case 'reserva':
        state.reservations.push(this.readReservation(insert));

        return;

      case 'linea_reserva':
        state.reservationLines.push(this.readReservationLine(insert));

        return;

      case 'factura':
        state.invoices.push(this.readInvoice(insert));

        return;
    }
  }

  private readCustomer(insert: LegacySqlInsert): LegacyCustomerRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      name: this.valueReader.getRequiredText(insert, 'nombre_apellidos'),
      document: this.valueReader.getOptionalText(insert, 'dni_cif'),
      phone: this.valueReader.getOptionalText(insert, 'telefono'),
      email: this.valueReader.getOptionalText(insert, 'email'),
      address: this.valueReader.getOptionalText(insert, 'direccion'),
      postalCode: this.valueReader.getOptionalText(insert, 'codigo_postal'),
      city: this.valueReader.getOptionalText(insert, 'poblacion'),
      provinceId: this.valueReader.getOptionalInteger(insert, 'provincia'),
      sameBillingData: this.valueReader.getRequiredBoolean(insert, 'fact_igual'),
      billingName: this.valueReader.getOptionalText(insert, 'fact_nombre_apellidos'),
      billingDocument: this.valueReader.getOptionalText(insert, 'fact_dni_cif'),
      billingPhone: this.valueReader.getOptionalText(insert, 'fact_telefono'),
      billingEmail: this.valueReader.getOptionalText(insert, 'fact_email'),
      billingAddress: this.valueReader.getOptionalText(insert, 'fact_direccion'),
      billingPostalCode: this.valueReader.getOptionalText(insert, 'fact_codigo_postal'),
      billingCity: this.valueReader.getOptionalText(insert, 'fact_poblacion'),
      billingProvinceId: this.valueReader.getOptionalInteger(insert, 'fact_provincia'),
      notes: this.valueReader.getOptionalText(insert, 'observaciones'),
      discount: this.valueReader.getRequiredInteger(insert, 'descuento'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readReservation(insert: LegacySqlInsert): LegacyReservationRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      customerId: this.valueReader.getRequiredInteger(insert, 'id_cliente'),
      total: this.valueReader.getRequiredNumber(insert, 'total'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readReservationLine(insert: LegacySqlInsert): LegacyReservationLineRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      reservationId: this.valueReader.getRequiredInteger(insert, 'id_reserva'),
      articleId: this.valueReader.getOptionalInteger(insert, 'id_articulo'),
      articleName: this.valueReader.getOptionalText(insert, 'nombre_articulo'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      taxRate: this.valueReader.getRequiredNumber(insert, 'iva'),
      total: this.valueReader.getRequiredNumber(insert, 'importe'),
      discount: this.valueReader.getOptionalNumber(insert, 'descuento'),
      discountAmount: this.valueReader.getOptionalNumber(insert, 'importe_descuento'),
      units: this.valueReader.getRequiredInteger(insert, 'unidades'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readInvoice(insert: LegacySqlInsert): LegacyInvoiceRow {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      customerId: this.valueReader.getRequiredInteger(insert, 'id_cliente'),
      number: this.valueReader.getOptionalInteger(insert, 'num_factura'),
      name: this.valueReader.getRequiredText(insert, 'nombre_apellidos'),
      document: this.valueReader.getOptionalText(insert, 'dni_cif'),
      phone: this.valueReader.getOptionalText(insert, 'telefono'),
      email: this.valueReader.getOptionalText(insert, 'email'),
      address: this.valueReader.getOptionalText(insert, 'direccion'),
      postalCode: this.valueReader.getOptionalText(insert, 'codigo_postal'),
      city: this.valueReader.getOptionalText(insert, 'poblacion'),
      provinceId: this.valueReader.getOptionalInteger(insert, 'provincia'),
      total: this.valueReader.getRequiredNumber(insert, 'importe'),
      printed: this.valueReader.getRequiredBoolean(insert, 'impresa'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private async insertCustomers(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    customers: readonly LegacyCustomerRow[],
    counters: MutableImportCounters,
  ): Promise<InsertedCustomers> {
    const activeDocumentOwners: ReadonlyMap<string, number> =
      this.getActiveDocumentOwners(customers);

    const customerIds: Set<number> = new Set<number>();

    const customerNames: Map<number, string> = new Map<number, string>();

    const sortedCustomers: readonly LegacyCustomerRow[] = [...customers].sort(
      (first: LegacyCustomerRow, second: LegacyCustomerRow): number => first.id - second.id,
    );

    for (const customer of sortedCustomers) {
      const name: string = this.normalizeRequiredText(
        customer.name,
        `Cliente legacy ${customer.id}`,
        150,
        counters,
      );

      let document: string | null = this.normalizeOptionalText(customer.document, 30, counters);

      if (customer.deletedAt === null && document !== null) {
        const documentOwner: number | undefined = activeDocumentOwners.get(
          this.normalizeDocumentKey(document),
        );

        if (documentOwner !== undefined && documentOwner !== customer.id) {
          document = null;

          counters.warningCount++;
        }
      }

      const sameBillingData: boolean = customer.sameBillingData;

      await queryRunner.query(
        `
          INSERT INTO cliente (
            id,
            public_id,
            nombre_apellidos,
            dni_cif,
            telefono,
            email,
            direccion,
            codigo_postal,
            poblacion,
            id_provincia,
            datos_facturacion_iguales,
            fact_nombre_apellidos,
            fact_dni_cif,
            fact_telefono,
            fact_email,
            fact_direccion,
            fact_codigo_postal,
            fact_poblacion,
            fact_id_provincia,
            observaciones,
            descuento_bps,
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
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          customer.id,
          this.publicIdFactory.create(command.sourceHash, 'cliente', customer.id),
          name,
          document,
          this.normalizeOptionalText(customer.phone, 30, counters),
          this.normalizeEmail(customer.email, counters),
          this.normalizeOptionalText(customer.address, 200, counters),
          this.normalizeOptionalText(customer.postalCode, 20, counters),
          this.normalizeOptionalText(customer.city, 100, counters),
          this.normalizeProvinceId(customer.provinceId, counters),
          sameBillingData ? 1 : 0,
          sameBillingData ? null : this.normalizeOptionalText(customer.billingName, 150, counters),
          sameBillingData
            ? null
            : this.normalizeOptionalText(customer.billingDocument, 30, counters),
          sameBillingData ? null : this.normalizeOptionalText(customer.billingPhone, 30, counters),
          sameBillingData ? null : this.normalizeEmail(customer.billingEmail, counters),
          sameBillingData
            ? null
            : this.normalizeOptionalText(customer.billingAddress, 200, counters),
          sameBillingData
            ? null
            : this.normalizeOptionalText(customer.billingPostalCode, 20, counters),
          sameBillingData ? null : this.normalizeOptionalText(customer.billingCity, 100, counters),
          sameBillingData ? null : this.normalizeProvinceId(customer.billingProvinceId, counters),
          this.normalizeOptionalText(customer.notes, null, counters),
          this.toBasisPoints(customer.discount, 'cliente.descuento', counters),
          customer.createdAt,
          customer.updatedAt,
          customer.deletedAt,
        ],
      );

      customerIds.add(customer.id);

      customerNames.set(customer.id, name);

      counters.importedRows++;
    }

    return {
      ids: customerIds,
      namesById: customerNames,
    };
  }

  private async insertReservations(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    reservations: readonly LegacyReservationRow[],
    customerIds: ReadonlySet<number>,
    counters: MutableImportCounters,
  ): Promise<ReadonlySet<number>> {
    const reservationIds: Set<number> = new Set<number>();

    for (const reservation of reservations) {
      if (!customerIds.has(reservation.customerId)) {
        throw new Error(
          [
            `La reserva ${reservation.id}`,
            `referencia el cliente inexistente ${reservation.customerId}.`,
          ].join(' '),
        );
      }

      await queryRunner.query(
        `
          INSERT INTO reserva (
            id,
            public_id,
            id_cliente,
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
            ?,
            NULL
          )
        `,
        [
          reservation.id,
          this.publicIdFactory.create(command.sourceHash, 'reserva', reservation.id),
          reservation.customerId,
          this.numberConverter.toCents(
            this.normalizeNonNegativeNumber(reservation.total, counters),
            `reserva ${reservation.id}.total`,
          ),
          reservation.createdAt,
          reservation.updatedAt,
        ],
      );

      reservationIds.add(reservation.id);

      counters.importedRows++;
    }

    return reservationIds;
  }

  private async insertReservationLines(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    lines: readonly LegacyReservationLineRow[],
    reservationIds: ReadonlySet<number>,
    articleNames: ReadonlyMap<number, string>,
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const line of lines) {
      if (!reservationIds.has(line.reservationId)) {
        throw new Error(
          [
            `La línea de reserva ${line.id}`,
            `referencia la reserva inexistente ${line.reservationId}.`,
          ].join(' '),
        );
      }

      if (line.units <= 0) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
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
        line.articleName ?? '',
        fallbackArticleName,
        200,
        counters,
      );

      await queryRunner.query(
        `
          INSERT INTO linea_reserva (
            id,
            public_id,
            id_reserva,
            id_articulo,
            nombre_articulo,
            puc_micros,
            pvp_cents,
            iva_bps,
            importe_cents,
            descuento_bps,
            importe_descuento_cents,
            unidades,
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
            ?
          )
        `,
        [
          line.id,
          this.publicIdFactory.create(command.sourceHash, 'linea_reserva', line.id),
          line.reservationId,
          articleId,
          articleName,
          this.numberConverter.toMicros(
            this.normalizeNonNegativeNumber(line.purchasePrice, counters),
            `linea_reserva ${line.id}.puc`,
          ),
          this.numberConverter.toCents(
            this.normalizeNonNegativeNumber(line.salePrice, counters),
            `linea_reserva ${line.id}.pvp`,
          ),
          this.toBasisPoints(line.taxRate, `linea_reserva ${line.id}.iva`, counters),
          this.numberConverter.toCents(
            this.normalizeNonNegativeNumber(line.total, counters),
            `linea_reserva ${line.id}.importe`,
          ),
          this.toBasisPoints(line.discount ?? 0, `linea_reserva ${line.id}.descuento`, counters),
          this.numberConverter.toCents(
            this.normalizeNonNegativeNumber(line.discountAmount ?? 0, counters),
            `linea_reserva ${line.id}.importe_descuento`,
          ),
          line.units,
          line.createdAt,
          line.updatedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertInvoices(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    invoices: readonly LegacyInvoiceRow[],
    customers: InsertedCustomers,
    counters: MutableImportCounters,
  ): Promise<void> {
    const usedInvoiceNumbers: Set<number> = new Set<number>();

    const sortedInvoices: readonly LegacyInvoiceRow[] = [...invoices].sort(
      (first: LegacyInvoiceRow, second: LegacyInvoiceRow): number => first.id - second.id,
    );

    for (const invoice of sortedInvoices) {
      if (!customers.ids.has(invoice.customerId)) {
        throw new Error(
          [
            `La factura ${invoice.id}`,
            `referencia el cliente inexistente ${invoice.customerId}.`,
          ].join(' '),
        );
      }

      let invoiceNumber: number | null = invoice.number;

      if (invoiceNumber !== null && invoiceNumber <= 0) {
        invoiceNumber = null;

        counters.warningCount++;
      }

      if (invoiceNumber !== null && usedInvoiceNumbers.has(invoiceNumber)) {
        throw new Error(
          [`El número de factura ${invoiceNumber}`, 'aparece más de una vez en el paquete.'].join(
            ' ',
          ),
        );
      }

      if (invoiceNumber !== null) {
        usedInvoiceNumbers.add(invoiceNumber);
      }

      const status: 'borrador' | 'emitida' | 'anulada' =
        invoiceNumber === null ? 'borrador' : invoice.deletedAt === null ? 'emitida' : 'anulada';

      let printed: boolean = invoice.printed;

      if (invoiceNumber === null && printed) {
        printed = false;

        counters.warningCount++;
      }

      const fallbackCustomerName: string =
        customers.namesById.get(invoice.customerId) ?? `Cliente legacy ${invoice.customerId}`;

      await queryRunner.query(
        `
          INSERT INTO factura (
            id,
            public_id,
            id_cliente,
            serie,
            numero,
            estado,
            nombre_apellidos,
            dni_cif,
            telefono,
            email,
            direccion,
            codigo_postal,
            poblacion,
            id_provincia,
            importe_cents,
            impresa,
            fecha_emision,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            '',
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
          invoice.id,
          this.publicIdFactory.create(command.sourceHash, 'factura', invoice.id),
          invoice.customerId,
          invoiceNumber,
          status,
          this.normalizeRequiredText(invoice.name, fallbackCustomerName, 150, counters),
          this.normalizeOptionalText(invoice.document, 30, counters),
          this.normalizeOptionalText(invoice.phone, 30, counters),
          this.normalizeEmail(invoice.email, counters),
          this.normalizeOptionalText(invoice.address, 200, counters),
          this.normalizeOptionalText(invoice.postalCode, 20, counters),
          this.normalizeOptionalText(invoice.city, 100, counters),
          this.normalizeProvinceId(invoice.provinceId, counters),
          this.numberConverter.toCents(
            this.normalizeNonNegativeNumber(invoice.total, counters),
            `factura ${invoice.id}.importe`,
          ),
          printed ? 1 : 0,
          invoiceNumber === null ? null : invoice.createdAt,
          invoice.createdAt,
          invoice.updatedAt,
          invoice.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async readArticleNames(queryRunner: QueryRunner): Promise<ReadonlyMap<number, string>> {
    const rows: readonly ArticleNameRow[] = (await queryRunner.query(
      `
            SELECT
              id,
              nombre
            FROM articulo
          `,
    )) as readonly ArticleNameRow[];

    return new Map<number, string>(
      rows.map((row: ArticleNameRow): [number, string] => [row.id, row.nombre]),
    );
  }

  private getActiveDocumentOwners(
    customers: readonly LegacyCustomerRow[],
  ): ReadonlyMap<string, number> {
    const owners: Map<string, number> = new Map<string, number>();

    const sortedCustomers: readonly LegacyCustomerRow[] = [...customers].sort(
      (first: LegacyCustomerRow, second: LegacyCustomerRow): number => first.id - second.id,
    );

    for (const customer of sortedCustomers) {
      if (customer.deletedAt !== null) {
        continue;
      }

      const document: string | null = this.normalizeTextWithoutWarning(customer.document);

      if (document === null) {
        continue;
      }

      const key: string = this.normalizeDocumentKey(document);

      if (!owners.has(key)) {
        owners.set(key, customer.id);
      }
    }

    return owners;
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

  private normalizeNonNegativeNumber(value: number, counters: MutableImportCounters): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizeProvinceId(
    provinceId: number | null,
    counters: MutableImportCounters,
  ): number | null {
    if (provinceId === null) {
      return null;
    }

    if (provinceId > 0) {
      return provinceId;
    }

    counters.warningCount++;

    return null;
  }

  private normalizeEmail(value: string | null, counters: MutableImportCounters): string | null {
    const email: string | null = this.normalizeOptionalText(value, 254, counters);

    if (email === null) {
      return null;
    }

    if (email.length >= 3) {
      return email;
    }

    counters.warningCount++;

    return null;
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

  private normalizeTextWithoutWarning(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized: string = value.trim();

    return normalized.length === 0 ? null : normalized;
  }

  private normalizeDocumentKey(value: string): string {
    return value.trim().toLocaleUpperCase('es-ES');
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
