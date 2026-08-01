import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import { randomUUID } from 'node:crypto';
import type { QueryRunner } from 'typeorm';

interface LastInsertIdRow {
  readonly id: number;
}

const DEFAULT_TERMINAL_NAME: string = 'Terminal principal';

const DEFAULT_TERMINAL_CODE: string = 'principal';

const DEFAULT_BRAND_NAME: string = 'Sin marca';

const CASH_PAYMENT_NAME: string = 'Efectivo';

const CASH_PAYMENT_SLUG: string = 'efectivo';

const SALE_SEQUENCE_TYPE: string = 'venta';

const INVOICE_SEQUENCE_TYPE: string = 'factura';

const DEFAULT_DOCUMENT_SERIES: string = '';

export default class NewInstallationDataService {
  async create(
    queryRunner: QueryRunner,
    command: InstallationCommand,
    passwordHash: string,
    createdAt: string,
  ): Promise<void> {
    await queryRunner.startTransaction();

    try {
      const terminalId: number = await this.createTerminal(queryRunner, createdAt);

      const employeeId: number = await this.createEmployee(
        queryRunner,
        command,
        passwordHash,
        createdAt,
      );

      const cashPaymentTypeId: number = await this.createCashPaymentType(queryRunner, createdAt);

      await this.createDefaultBrand(queryRunner, createdAt);

      await this.createDocumentSequences(queryRunner, command, createdAt);

      const cashRegisterId: number = await this.createInitialCashRegister(
        queryRunner,
        command,
        terminalId,
        employeeId,
        createdAt,
      );

      await this.createInitialCashRegisterType(
        queryRunner,
        cashRegisterId,
        cashPaymentTypeId,
        createdAt,
      );

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    }
  }

  private async createTerminal(queryRunner: QueryRunner, createdAt: string): Promise<number> {
    await queryRunner.query(
      `
        INSERT INTO terminal (
          public_id,
          nombre,
          codigo,
          activo,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?,
          ?,
          ?,
          1,
          ?,
          ?,
          NULL
        )
      `,
      [randomUUID(), DEFAULT_TERMINAL_NAME, DEFAULT_TERMINAL_CODE, createdAt, createdAt],
    );

    return this.getLastInsertId(queryRunner);
  }

  private async createEmployee(
    queryRunner: QueryRunner,
    command: InstallationCommand,
    passwordHash: string,
    createdAt: string,
  ): Promise<number> {
    const normalizedColor: string = command.empleadoInicial.color.replace(/^#/, '').toUpperCase();

    await queryRunner.query(
      `
        INSERT INTO empleado (
          public_id,
          nombre,
          password_hash,
          password_algorithm,
          color,
          admin,
          activo,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?,
          ?,
          ?,
          'scrypt',
          ?,
          1,
          1,
          ?,
          ?,
          NULL
        )
      `,
      [
        randomUUID(),
        command.empleadoInicial.nombre.trim(),
        passwordHash,
        normalizedColor,
        createdAt,
        createdAt,
      ],
    );

    return this.getLastInsertId(queryRunner);
  }

  private async createCashPaymentType(
    queryRunner: QueryRunner,
    createdAt: string,
  ): Promise<number> {
    await queryRunner.query(
      `
        INSERT INTO tipo_pago (
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
          NULL,
          ?,
          ?,
          1,
          0,
          1,
          1,
          ?,
          ?,
          NULL
        )
      `,
      [randomUUID(), CASH_PAYMENT_NAME, CASH_PAYMENT_SLUG, createdAt, createdAt],
    );

    return this.getLastInsertId(queryRunner);
  }

  private async createDefaultBrand(queryRunner: QueryRunner, createdAt: string): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO marca (
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
          NULL,
          ?,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          ?,
          ?,
          NULL
        )
      `,
      [randomUUID(), DEFAULT_BRAND_NAME, createdAt, createdAt],
    );
  }

  private async createDocumentSequences(
    queryRunner: QueryRunner,
    command: InstallationCommand,
    createdAt: string,
  ): Promise<void> {
    const initialSaleNumber: number = command.valoresIniciales.ticketInicial;

    const initialInvoiceNumber: number = command.valoresIniciales.facturaInicial;

    if (!Number.isInteger(initialSaleNumber) || initialSaleNumber <= 0) {
      throw new Error('El número inicial de ticket no es válido.');
    }

    if (!Number.isInteger(initialInvoiceNumber) || initialInvoiceNumber <= 0) {
      throw new Error('El número inicial de factura no es válido.');
    }

    await queryRunner.query(
      `
        INSERT INTO secuencia_documento (
          tipo,
          serie,
          ultimo_numero,
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
      [SALE_SEQUENCE_TYPE, DEFAULT_DOCUMENT_SERIES, initialSaleNumber - 1, createdAt, createdAt],
    );

    await queryRunner.query(
      `
        INSERT INTO secuencia_documento (
          tipo,
          serie,
          ultimo_numero,
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
      [
        INVOICE_SEQUENCE_TYPE,
        DEFAULT_DOCUMENT_SERIES,
        initialInvoiceNumber - 1,
        createdAt,
        createdAt,
      ],
    );
  }

  private async createInitialCashRegister(
    queryRunner: QueryRunner,
    command: InstallationCommand,
    terminalId: number,
    employeeId: number,
    createdAt: string,
  ): Promise<number> {
    const openingAmountCents: number = this.toCents(command.valoresIniciales.cajaInicial);

    await queryRunner.query(
      `
        INSERT INTO caja (
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
          ?,
          NULL,
          ?,
          NULL,
          0,
          0,
          0,
          0,
          0,
          ?,
          0,
          0,
          0,
          NULL,
          ?,
          ?
        )
      `,
      [randomUUID(), terminalId, employeeId, createdAt, openingAmountCents, createdAt, createdAt],
    );

    return this.getLastInsertId(queryRunner);
  }

  private async createInitialCashRegisterType(
    queryRunner: QueryRunner,
    cashRegisterId: number,
    cashPaymentTypeId: number,
    createdAt: string,
  ): Promise<void> {
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
          0,
          0,
          NULL,
          0,
          ?,
          ?
        )
      `,
      [cashRegisterId, cashPaymentTypeId, createdAt, createdAt],
    );
  }

  private async getLastInsertId(queryRunner: QueryRunner): Promise<number> {
    const rows: LastInsertIdRow[] = (await queryRunner.query(
      `
          SELECT
            last_insert_rowid() AS id
        `,
    )) as LastInsertIdRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error('No se ha podido obtener el identificador del registro insertado.');
    }

    return id;
  }

  private toCents(amount: number): number {
    const cents: number = Math.round(amount * 100);

    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new Error('El importe inicial de caja no es válido.');
    }

    return cents;
  }
}
