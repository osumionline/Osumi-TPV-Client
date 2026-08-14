import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';
import type { ReservaLineaRecord } from '@backend/domain/reservas/reserva-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource, QueryRunner } from 'typeorm';

interface ReservaDatabaseRow {
  readonly id: number;
  readonly public_id: string;

  readonly id_cliente: number;
  readonly cliente_public_id: string;
  readonly cliente_nombre: string;

  readonly total_cents: number;

  readonly fecha: string;
}

interface ReservaLineaDatabaseRow {
  readonly id: number;
  readonly public_id: string;

  readonly id_reserva: number;

  readonly id_articulo: number | null;
  readonly articulo_public_id: string | null;

  readonly localizador: number | null;
  readonly marca: string | null;

  readonly nombre: string;

  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly iva_bps: number;

  readonly importe_cents: number;

  readonly descuento_bps: number;
  readonly importe_descuento_cents: number;

  readonly unidades: number;
}

interface ReservaLineaDeleteDatabaseRow {
  readonly id: number;
  readonly id_reserva: number;

  readonly id_articulo: number | null;

  readonly unidades: number;
}

interface CountDatabaseRow {
  readonly total: number;
}

interface ReservaDeleteDatabaseRow {
  readonly id: number;
}

interface ReservaStockDatabaseRow {
  readonly id_articulo: number | null;
  readonly unidades: number;
}

export default class TypeOrmReservasRepository implements ReservasRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera todas las reservas activas junto
   * con sus líneas.
   */
  async findAllActive(): Promise<readonly ReservaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const reservas: readonly ReservaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              r.id,
              r.public_id,

              r.id_cliente,
              c.public_id
                AS cliente_public_id,
              c.nombre_apellidos
                AS cliente_nombre,

              r.total_cents,

              r.created_at AS fecha

            FROM reserva r

            INNER JOIN cliente c
              ON c.id = r.id_cliente

            WHERE
              r.deleted_at IS NULL

            ORDER BY
              r.created_at DESC,
              r.id DESC
          `,
    )) as readonly ReservaDatabaseRow[];

    if (reservas.length === 0) {
      return [];
    }

    const lineas: readonly ReservaLineaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              lr.id,
              lr.public_id,

              lr.id_reserva,

              lr.id_articulo,
              a.public_id
                AS articulo_public_id,

              a.localizador,
              m.nombre AS marca,

              lr.nombre_articulo AS nombre,

              lr.puc_micros,
              lr.pvp_cents,
              lr.iva_bps,

              lr.importe_cents,

              lr.descuento_bps,
              lr.importe_descuento_cents,

              lr.unidades

            FROM linea_reserva lr

            INNER JOIN reserva r
              ON r.id = lr.id_reserva

            LEFT JOIN articulo a
              ON a.id = lr.id_articulo

            LEFT JOIN marca m
              ON m.id = a.id_marca

            WHERE
              r.deleted_at IS NULL

            ORDER BY
              lr.id_reserva,
              lr.id
          `,
    )) as readonly ReservaLineaDatabaseRow[];

    const lineasByReserva: Map<number, ReservaLineaRecord[]> = new Map<
      number,
      ReservaLineaRecord[]
    >();

    for (const linea of lineas) {
      const reservaLineas: ReservaLineaRecord[] = lineasByReserva.get(linea.id_reserva) ?? [];

      reservaLineas.push({
        id: linea.id,
        publicId: linea.public_id,

        idArticulo: linea.id_articulo,
        articuloPublicId: linea.articulo_public_id,

        localizador: linea.localizador,
        marca: linea.marca,

        nombre: linea.nombre,

        pucMicros: linea.puc_micros,
        pvpCents: linea.pvp_cents,
        ivaBps: linea.iva_bps,

        importeCents: linea.importe_cents,

        descuentoBps: linea.descuento_bps,

        importeDescuentoCents: linea.importe_descuento_cents,

        unidades: linea.unidades,
      });

      lineasByReserva.set(linea.id_reserva, reservaLineas);
    }

    return reservas.map((reserva: ReservaDatabaseRow): ReservaRecord => ({
      id: reserva.id,
      publicId: reserva.public_id,

      idCliente: reserva.id_cliente,

      clientePublicId: reserva.cliente_public_id,

      clienteNombre: reserva.cliente_nombre,

      totalCents: reserva.total_cents,

      fecha: reserva.fecha,

      lineas: lineasByReserva.get(reserva.id) ?? [],
    }));
  }

  /**
   * Elimina una línea activa de reserva y devuelve
   * al stock las unidades que estaban inmovilizadas.
   *
   * Si era la última línea, cancela la reserva
   * completa conservando su histórico.
   */
  async deleteLinea(publicId: string): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows: readonly ReservaLineaDeleteDatabaseRow[] = (await queryRunner.query(
        `
              SELECT
                lr.id,
                lr.id_reserva,
                lr.id_articulo,
                lr.unidades

              FROM linea_reserva lr

              INNER JOIN reserva r
                ON r.id = lr.id_reserva

              WHERE
                lr.public_id = ?
                AND r.deleted_at IS NULL

              LIMIT 1
            `,
        [publicId],
      )) as readonly ReservaLineaDeleteDatabaseRow[];

      const linea: ReservaLineaDeleteDatabaseRow | undefined = rows[0];

      if (linea === undefined) {
        await queryRunner.commitTransaction();

        return false;
      }

      const countRows: readonly CountDatabaseRow[] = (await queryRunner.query(
        `
              SELECT
                COUNT(*) AS total
              FROM linea_reserva
              WHERE id_reserva = ?
            `,
        [linea.id_reserva],
      )) as readonly CountDatabaseRow[];

      const totalLineas: number = countRows[0]?.total ?? 0;

      const timestamp: string = new Date().toISOString();

      await this.restoreStock(queryRunner, linea.id_articulo, linea.unidades, timestamp);

      /*
       * Si era la última línea, la operación equivale
       * a cancelar la reserva completa.
       *
       * Conservamos la línea histórica y marcamos
       * únicamente la reserva como eliminada.
       */
      if (totalLineas <= 1) {
        await queryRunner.query(
          `
            UPDATE reserva
            SET
              deleted_at = ?,
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [timestamp, timestamp, linea.id_reserva],
        );
      } else {
        await queryRunner.query(
          `
            DELETE FROM linea_reserva
            WHERE id = ?
          `,
          [linea.id],
        );

        /*
         * Recalculamos desde las líneas que realmente
         * permanecen en SQLite en vez de confiar en
         * el total anterior.
         */
        await queryRunner.query(
          `
            UPDATE reserva
            SET
              total_cents = (
                SELECT
                  COALESCE(
                    SUM(importe_cents),
                    0
                  )
                FROM linea_reserva
                WHERE
                  id_reserva = ?
              ),
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [linea.id_reserva, timestamp, linea.id_reserva],
        );
      }

      await queryRunner.commitTransaction();

      return true;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error('No se ha podido eliminar la línea de reserva.', {
        cause: error,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancela una reserva completa restaurando antes
   * el stock de todas sus líneas.
   */
  async deleteReserva(publicId: string): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservaRows: readonly ReservaDeleteDatabaseRow[] = (await queryRunner.query(
        `
              SELECT
                id
              FROM reserva
              WHERE
                public_id = ?
                AND deleted_at IS NULL
              LIMIT 1
            `,
        [publicId],
      )) as readonly ReservaDeleteDatabaseRow[];

      const reserva: ReservaDeleteDatabaseRow | undefined = reservaRows[0];

      if (reserva === undefined) {
        await queryRunner.commitTransaction();

        return false;
      }

      const lineas: readonly ReservaStockDatabaseRow[] = (await queryRunner.query(
        `
              SELECT
                id_articulo,
                unidades
              FROM linea_reserva
              WHERE id_reserva = ?
              ORDER BY id
            `,
        [reserva.id],
      )) as readonly ReservaStockDatabaseRow[];

      const timestamp: string = new Date().toISOString();

      for (const linea of lineas) {
        await this.restoreStock(queryRunner, linea.id_articulo, linea.unidades, timestamp);
      }

      /*
       * Se realiza borrado lógico.
       *
       * linea_reserva se conserva como histórico
       * asociado a una reserva cancelada.
       */
      await queryRunner.query(
        `
          UPDATE reserva
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, reserva.id],
      );

      await queryRunner.commitTransaction();

      return true;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error('No se ha podido eliminar la reserva.', {
        cause: error,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Devuelve al stock las unidades reservadas.
   *
   * Una línea sin artículo —por ejemplo un Varios—
   * no afecta al stock.
   */
  private async restoreStock(
    queryRunner: QueryRunner,
    idArticulo: number | null,
    unidades: number,
    timestamp: string,
  ): Promise<void> {
    if (idArticulo === null) {
      return;
    }

    await queryRunner.query(
      `
        UPDATE articulo
        SET
          stock = stock + ?,
          updated_at = ?
        WHERE id = ?
      `,
      [unidades, timestamp, idArticulo],
    );
  }
}
