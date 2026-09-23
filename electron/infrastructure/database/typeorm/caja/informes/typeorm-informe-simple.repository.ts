import type InformeSimpleRepository from '@backend/contracts/caja/informes/informe-simple.repository.interface';
import type {
  InformeSimplePagoRecord,
  InformeSimpleRepositoryResult,
  InformeSimpleTipoPagoRecord,
  InformeSimpleVentaRecord,
} from '@backend/domain/caja/informes/informe-simple-record.interface';
import type TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface InformeSimpleVentaDatabaseRow {
  readonly id: number;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly total_cents: number;
}

interface InformeSimplePagoDatabaseRow {
  readonly id_venta: number;
  readonly tipo_pago_public_id: string;
  readonly importe_cents: number;
}

interface InformeSimpleTipoPagoDatabaseRow {
  readonly public_id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly orden: number;
}

/**
 * Implementa las consultas SQLite necesarias
 * para construir el Informe Simple de Caja.
 */
export default class TypeOrmInformeSimpleRepository implements InformeSimpleRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera ventas válidas, sus pagos reales y los tipos
   * de pago relevantes dentro del intervalo solicitado.
   */
  async findByPeriod(
    desde: string,
    hastaExclusive: string,
  ): Promise<InformeSimpleRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const ventasRows: readonly InformeSimpleVentaDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            v.id,
            v.serie,
            v.numero,
            v.created_at AS fecha,
            v.total_cents
          FROM venta v
          WHERE
            v.created_at >= ?
            AND v.created_at < ?
            AND v.deleted_at IS NULL
          ORDER BY
            v.created_at,
            v.id
        `,
      [desde, hastaExclusive],
    )) as readonly InformeSimpleVentaDatabaseRow[];

    const pagosRows: readonly InformeSimplePagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            vp.id_venta,
            tp.public_id AS tipo_pago_public_id,
            vp.importe_cents
          FROM venta_pago vp

          INNER JOIN venta v
            ON v.id = vp.id_venta

          INNER JOIN tipo_pago tp
            ON tp.id = vp.id_tipo_pago

          WHERE
            v.created_at >= ?
            AND v.created_at < ?
            AND v.deleted_at IS NULL

          ORDER BY
            v.created_at,
            v.id,
            vp.orden,
            vp.id
        `,
      [desde, hastaExclusive],
    )) as readonly InformeSimplePagoDatabaseRow[];

    const tiposPagoRows: readonly InformeSimpleTipoPagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            tp.public_id,
            tp.nombre,
            tp.slug,
            tp.orden
          FROM tipo_pago tp
          WHERE
            tp.slug = 'efectivo'
            OR EXISTS (
              SELECT 1
              FROM venta_pago vp

              INNER JOIN venta v
                ON v.id = vp.id_venta

              WHERE
                vp.id_tipo_pago = tp.id
                AND v.created_at >= ?
                AND v.created_at < ?
                AND v.deleted_at IS NULL
            )
          ORDER BY
            CASE
              WHEN tp.slug = 'efectivo' THEN 0
              ELSE 1
            END,
            tp.orden,
            tp.nombre COLLATE NOCASE,
            tp.id
        `,
      [desde, hastaExclusive],
    )) as readonly InformeSimpleTipoPagoDatabaseRow[];

    const ventas: readonly InformeSimpleVentaRecord[] = ventasRows.map(
      (row: InformeSimpleVentaDatabaseRow): InformeSimpleVentaRecord => ({
        id: row.id,
        serie: row.serie,
        numero: row.numero,
        fecha: row.fecha,
        totalCents: row.total_cents,
      }),
    );

    const pagos: readonly InformeSimplePagoRecord[] = pagosRows.map(
      (row: InformeSimplePagoDatabaseRow): InformeSimplePagoRecord => ({
        idVenta: row.id_venta,
        tipoPagoPublicId: row.tipo_pago_public_id,
        importeCents: row.importe_cents,
      }),
    );

    const tiposPago: readonly InformeSimpleTipoPagoRecord[] = tiposPagoRows.map(
      (row: InformeSimpleTipoPagoDatabaseRow): InformeSimpleTipoPagoRecord => ({
        publicId: row.public_id,
        nombre: row.nombre,
        slug: row.slug,
        orden: row.orden,
      }),
    );

    return {
      ventas,
      pagos,
      tiposPago,
    };
  }
}
