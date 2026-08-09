import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface TerminalIdDatabaseRow {
  readonly id: number;
}

interface CajaAbiertaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_terminal: number;
  readonly apertura: string;
  readonly importe_apertura_cents: number;
}

interface CajaAnteriorDatabaseRow {
  readonly importe_cierre_real_cents: number;
  readonly movimientos_entrada_cents: number;
}

interface LastInsertIdDatabaseRow {
  readonly id: number;
}

/**
 * Gestiona la persistencia de las operaciones de caja sobre SQLite.
 */
export default class TypeOrmCajaRepository implements CajaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene la caja abierta del terminal o crea una nueva de forma transaccional.
   */
  async open(command: AbrirCajaCommand): Promise<CajaAbiertaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const terminalId: number = await this.getTerminalId(queryRunner, command.terminalPublicId);

      const cajaAbierta: CajaAbiertaRecord | null = await this.getCajaAbierta(
        queryRunner,
        terminalId,
      );

      if (cajaAbierta !== null) {
        await queryRunner.commitTransaction();

        return cajaAbierta;
      }

      const importeAperturaCents: number = await this.getImporteAperturaCents(
        queryRunner,
        terminalId,
      );

      const apertura: string = new Date().toISOString();
      const publicId: string = randomUUID();

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
            NULL,
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
        [publicId, terminalId, apertura, importeAperturaCents, apertura, apertura],
      );

      const id: number = await this.getLastInsertId(queryRunner);

      await this.createPaymentTypeRows(queryRunner, id, apertura);

      const result: CajaAbiertaRecord = {
        id,
        publicId,
        idTerminal: terminalId,
        apertura,
        importeAperturaCents,
      };

      await queryRunner.commitTransaction();

      return result;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error('No se ha podido abrir la caja.', {
        cause: error,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Resuelve el identificador local de un terminal activo mediante su identificador público.
   */
  private async getTerminalId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly TerminalIdDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          t.id
        FROM terminal t
        WHERE
          t.public_id = ?
          AND t.activo = 1
          AND t.deleted_at IS NULL
        LIMIT 1
      `,
      [publicId],
    )) as readonly TerminalIdDatabaseRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('No se ha encontrado el terminal indicado.');
    }

    return id;
  }

  /**
   * Obtiene la caja que ya esté abierta para el terminal.
   */
  private async getCajaAbierta(
    queryRunner: QueryRunner,
    terminalId: number,
  ): Promise<CajaAbiertaRecord | null> {
    const rows: readonly CajaAbiertaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_terminal,
          c.apertura,
          c.importe_apertura_cents
        FROM caja c
        WHERE
          c.id_terminal = ?
          AND c.cierre IS NULL
        ORDER BY
          c.apertura DESC,
          c.id DESC
        LIMIT 1
      `,
      [terminalId],
    )) as readonly CajaAbiertaDatabaseRow[];

    const row: CajaAbiertaDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    return this.mapCajaAbierta(row);
  }

  /**
   * Calcula el importe con el que debe comenzar una nueva caja.
   */
  private async getImporteAperturaCents(
    queryRunner: QueryRunner,
    terminalId: number,
  ): Promise<number> {
    const rows: readonly CajaAnteriorDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.importe_cierre_real_cents,
          c.movimientos_entrada_cents
        FROM caja c
        WHERE
          c.id_terminal = ?
          AND c.cierre IS NOT NULL
        ORDER BY
          c.cierre DESC,
          c.id DESC
        LIMIT 1
      `,
      [terminalId],
    )) as readonly CajaAnteriorDatabaseRow[];

    const cajaAnterior: CajaAnteriorDatabaseRow | undefined = rows[0];

    if (cajaAnterior === undefined) {
      return 0;
    }

    const importeAperturaCents: number =
      cajaAnterior.importe_cierre_real_cents + cajaAnterior.movimientos_entrada_cents;

    if (!Number.isSafeInteger(importeAperturaCents) || importeAperturaCents < 0) {
      throw new Error('El importe de apertura calculado para la nueva caja no es válido.');
    }

    return importeAperturaCents;
  }

  /**
   * Inicializa los acumulados de la caja para los tipos de pago actualmente activos.
   */
  private async createPaymentTypeRows(
    queryRunner: QueryRunner,
    cajaId: number,
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
        SELECT
          ?,
          tp.id,
          0,
          0,
          NULL,
          0,
          ?,
          ?
        FROM tipo_pago tp
        WHERE
          tp.activo = 1
          AND tp.deleted_at IS NULL
      `,
      [cajaId, createdAt, createdAt],
    );
  }

  /**
   * Obtiene el identificador generado por el último INSERT del QueryRunner.
   */
  private async getLastInsertId(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly LastInsertIdDatabaseRow[] = (await queryRunner.query(`
      SELECT
        last_insert_rowid() AS id
    `)) as readonly LastInsertIdDatabaseRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error('No se ha podido obtener el identificador de la caja creada.');
    }

    return id;
  }

  /**
   * Convierte una fila SQLite en el record de una caja abierta.
   */
  private mapCajaAbierta(row: CajaAbiertaDatabaseRow): CajaAbiertaRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      idTerminal: row.id_terminal,
      apertura: row.apertura,
      importeAperturaCents: row.importe_apertura_cents,
    };
  }
}
