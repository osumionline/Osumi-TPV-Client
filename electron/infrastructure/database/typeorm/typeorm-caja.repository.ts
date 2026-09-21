import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface IdDatabaseRow {
  readonly id: number;
}

interface SalidaCajaEditableDatabaseRow {
  readonly id: number;
  readonly created_at: string;
}

interface SalidaCajaDatabaseRow {
  readonly public_id: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importe_cents: number;
  readonly fecha: string;
  readonly editable: number;
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

interface TerminalIdDatabaseRow {
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

    try {
      return await runDataSourceTransaction(
        dataSource,
        async (queryRunner: QueryRunner): Promise<CajaAbiertaRecord> => {
          const terminalId: number = await this.getTerminalId(
            queryRunner,
            command.terminalPublicId,
          );

          const cajaAbierta: CajaAbiertaRecord | null = await this.getCajaAbierta(
            queryRunner,
            terminalId,
          );

          if (cajaAbierta !== null) {
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

          const id: number = await getLastInsertId(
            queryRunner,
            'No se ha podido obtener el identificador de la caja creada.',
          );

          await this.createPaymentTypeRows(queryRunner, id, apertura);

          return {
            id,
            publicId,
            idTerminal: terminalId,
            apertura,
            importeAperturaCents,
          };
        },
      );
    } catch (error: unknown) {
      throw new Error('No se ha podido abrir la caja.', {
        cause: error,
      });
    }
  }

  /**
   * Recupera las salidas activas correspondientes al intervalo indicado.
   */
  async findSalidasByPeriod(
    desde: string,
    hastaExclusive: string,
  ): Promise<readonly SalidaCajaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly SalidaCajaDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        mc.public_id,
        mc.concepto,
        mc.descripcion,
        mc.importe_cents,
        mc.created_at AS fecha,
        CASE
          WHEN c.cierre IS NULL THEN 1
          ELSE 0
        END AS editable
      FROM movimiento_caja mc

      INNER JOIN caja c
        ON c.id = mc.id_caja

      WHERE
        mc.tipo = 'salida'
        AND mc.deleted_at IS NULL
        AND mc.created_at >= ?
        AND mc.created_at < ?

      ORDER BY
        mc.created_at DESC,
        mc.id DESC
    `,
      [desde, hastaExclusive],
    )) as readonly SalidaCajaDatabaseRow[];

    return rows.map((row: SalidaCajaDatabaseRow): SalidaCajaRecord => ({
      publicId: row.public_id,
      concepto: row.concepto,
      descripcion: row.descripcion,
      importeCents: row.importe_cents,
      fecha: row.fecha,
      editable: row.editable === 1,
    }));
  }

  /**
   * Crea una nueva salida sobre una caja todavía abierta.
   */
  async createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<SalidaCajaRecord> => {
        const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

        const publicId: string = randomUUID();
        const now: string = new Date().toISOString();

        await queryRunner.query(
          `
          INSERT INTO movimiento_caja (
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
          [publicId, cajaId, command.concepto, command.importeCents, command.descripcion, now, now],
        );

        await this.refreshSalidaAggregate(queryRunner, cajaId, now);

        return {
          publicId,
          concepto: command.concepto,
          descripcion: command.descripcion,
          importeCents: command.importeCents,
          fecha: now,
          editable: true,
        };
      },
    );
  }

  /**
   * Actualiza una salida únicamente cuando continúa
   * perteneciendo a la caja abierta indicada.
   */
  async updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<SalidaCajaRecord> => {
        const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

        const current: SalidaCajaEditableDatabaseRow = await this.requireEditableSalida(
          queryRunner,
          command.publicId,
          cajaId,
        );

        const now: string = new Date().toISOString();

        await queryRunner.query(
          `
          UPDATE movimiento_caja
          SET
            concepto = ?,
            importe_cents = ?,
            descripcion = ?,
            updated_at = ?
          WHERE id = ?
        `,
          [command.concepto, command.importeCents, command.descripcion, now, current.id],
        );

        await this.refreshSalidaAggregate(queryRunner, cajaId, now);

        return {
          publicId: command.publicId,
          concepto: command.concepto,
          descripcion: command.descripcion,
          importeCents: command.importeCents,
          fecha: current.created_at,
          editable: true,
        };
      },
    );
  }

  /**
   * Da de baja lógicamente una salida de la caja abierta indicada.
   */
  async deleteSalida(command: EliminarSalidaCajaCommand): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

      const current: SalidaCajaEditableDatabaseRow = await this.requireEditableSalida(
        queryRunner,
        command.publicId,
        cajaId,
      );

      const now: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE movimiento_caja
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE id = ?
        `,
        [now, now, current.id],
      );

      await this.refreshSalidaAggregate(queryRunner, cajaId, now);
    });
  }

  /**
   * Resuelve una caja únicamente cuando sigue abierta.
   */
  private async requireOpenCajaId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly IdDatabaseRow[] = (await queryRunner.query(
      `
      SELECT
        c.id
      FROM caja c
      WHERE
        c.public_id = ?
        AND c.cierre IS NULL
      LIMIT 1
    `,
      [publicId],
    )) as readonly IdDatabaseRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('La caja indicada no está abierta.');
    }

    return id;
  }

  /**
   * Recupera una salida activa únicamente cuando
   * pertenece a la caja abierta indicada.
   */
  private async requireEditableSalida(
    queryRunner: QueryRunner,
    publicId: string,
    cajaId: number,
  ): Promise<SalidaCajaEditableDatabaseRow> {
    const rows: readonly SalidaCajaEditableDatabaseRow[] = (await queryRunner.query(
      `
      SELECT
        mc.id,
        mc.created_at
      FROM movimiento_caja mc
      WHERE
        mc.public_id = ?
        AND mc.id_caja = ?
        AND mc.tipo = 'salida'
        AND mc.deleted_at IS NULL
      LIMIT 1
    `,
      [publicId, cajaId],
    )) as readonly SalidaCajaEditableDatabaseRow[];

    const row: SalidaCajaEditableDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('La salida de caja no pertenece a la caja activa o ya no está disponible.');
    }

    return row;
  }

  /**
   * Reconstruye el acumulado de salidas de una caja
   * a partir de sus movimientos todavía activos.
   */
  private async refreshSalidaAggregate(
    queryRunner: QueryRunner,
    cajaId: number,
    updatedAt: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE caja
      SET
        movimientos_salida_cents = (
          SELECT
            COALESCE(
              SUM(mc.importe_cents),
              0
            )
          FROM movimiento_caja mc
          WHERE
            mc.id_caja = ?
            AND mc.tipo = 'salida'
            AND mc.deleted_at IS NULL
        ),
        updated_at = ?
      WHERE id = ?
    `,
      [cajaId, updatedAt, cajaId],
    );
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
