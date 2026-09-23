import type InformeDetalladoRepository from '@backend/contracts/caja/informes/informe-detallado.repository.interface';
import type {
  InformeDetalladoArticuloRecord,
  InformeDetalladoMarcaRecord,
  InformeDetalladoRepositoryResult,
  InformeDetalladoResumenRecord,
} from '@backend/domain/caja/informes/informe-detallado-record.interface';
import type TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface InformeDetalladoResumenDatabaseRow {
  readonly numero_ventas: number;
  readonly total_ventas_pvp_micros: number;
  readonly total_beneficio_micros: number;
}

interface InformeDetalladoMarcaDatabaseRow {
  readonly marca_public_id: string;
  readonly nombre: string;

  readonly total_ventas_pvp_micros: number;
  readonly total_beneficio_micros: number;

  readonly total_ventas_pvp_anterior_micros: number;
  readonly total_beneficio_anterior_micros: number;
}

interface InformeDetalladoArticuloDatabaseRow {
  readonly id_articulo: number;
  readonly articulo_public_id: string;
  readonly marca: string;
  readonly nombre: string;

  readonly total_unidades_vendidas: number;
  readonly total_ventas_pvp_micros: number;
  readonly total_beneficio_micros: number;
  readonly numero_ventas_articulo: number;

  readonly total_ventas_pvp_anterior_micros: number | null;
  readonly total_beneficio_anterior_micros: number | null;
}

/**
 * Implementa las consultas SQLite utilizadas
 * por el Informe Detallado de Caja.
 */
export default class TypeOrmInformeDetalladoRepository implements InformeDetalladoRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera resumen, marcas y Top 50 de artículos
   * para el periodo actual y su periodo comparable.
   */
  async find(
    actualDesde: string,
    actualHastaExclusive: string,
    anteriorDesde: string,
    anteriorHastaExclusive: string,
  ): Promise<InformeDetalladoRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const actual: InformeDetalladoResumenRecord = await this.findResumen(
      dataSource,
      actualDesde,
      actualHastaExclusive,
    );

    const anterior: InformeDetalladoResumenRecord = await this.findResumen(
      dataSource,
      anteriorDesde,
      anteriorHastaExclusive,
    );

    const marcasRows: readonly InformeDetalladoMarcaDatabaseRow[] = (await dataSource.query(
      `
            WITH actual AS (
              SELECT
                lv.id_marca_snapshot AS id_marca,
                COALESCE(
                  SUM(
                    lv.pvp_micros * lv.unidades
                  ),
                  0
                ) AS total_ventas_pvp_micros,
                COALESCE(
                  SUM(
                    (
                      lv.pvp_micros -
                      lv.puc_micros
                    ) * lv.unidades
                  ),
                  0
                ) AS total_beneficio_micros
              FROM linea_venta lv

              INNER JOIN venta v
                ON v.id = lv.id_venta

              WHERE
                v.deleted_at IS NULL
                AND v.created_at >= ?
                AND v.created_at < ?
                AND lv.id_marca_snapshot IS NOT NULL

              GROUP BY
                lv.id_marca_snapshot
            ),

            anterior AS (
              SELECT
                lv.id_marca_snapshot AS id_marca,
                COALESCE(
                  SUM(
                    lv.pvp_micros * lv.unidades
                  ),
                  0
                ) AS total_ventas_pvp_micros,
                COALESCE(
                  SUM(
                    (
                      lv.pvp_micros -
                      lv.puc_micros
                    ) * lv.unidades
                  ),
                  0
                ) AS total_beneficio_micros
              FROM linea_venta lv

              INNER JOIN venta v
                ON v.id = lv.id_venta

              WHERE
                v.deleted_at IS NULL
                AND v.created_at >= ?
                AND v.created_at < ?
                AND lv.id_marca_snapshot IS NOT NULL

              GROUP BY
                lv.id_marca_snapshot
            )

            SELECT
              m.public_id AS marca_public_id,
              m.nombre,

              COALESCE(
                actual.total_ventas_pvp_micros,
                0
              ) AS total_ventas_pvp_micros,

              COALESCE(
                actual.total_beneficio_micros,
                0
              ) AS total_beneficio_micros,

              COALESCE(
                anterior.total_ventas_pvp_micros,
                0
              ) AS total_ventas_pvp_anterior_micros,

              COALESCE(
                anterior.total_beneficio_micros,
                0
              ) AS total_beneficio_anterior_micros

            FROM marca m

            LEFT JOIN actual
              ON actual.id_marca = m.id

            LEFT JOIN anterior
              ON anterior.id_marca = m.id

            ORDER BY
              total_ventas_pvp_micros DESC,
              m.nombre COLLATE NOCASE,
              m.id
          `,
      [actualDesde, actualHastaExclusive, anteriorDesde, anteriorHastaExclusive],
    )) as readonly InformeDetalladoMarcaDatabaseRow[];

    const articulosRows: readonly InformeDetalladoArticuloDatabaseRow[] = (await dataSource.query(
      `
            WITH actual AS (
              SELECT
                lv.id_articulo,

                SUM(
                  lv.unidades
                ) AS total_unidades_vendidas,

                SUM(
                  lv.pvp_micros * lv.unidades
                ) AS total_ventas_pvp_micros,

                SUM(
                  (
                    lv.pvp_micros -
                    lv.puc_micros
                  ) * lv.unidades
                ) AS total_beneficio_micros,

                COUNT(
                  DISTINCT lv.id_venta
                ) AS numero_ventas_articulo

              FROM linea_venta lv

              INNER JOIN venta v
                ON v.id = lv.id_venta

              WHERE
                v.deleted_at IS NULL
                AND v.created_at >= ?
                AND v.created_at < ?
                AND lv.id_articulo IS NOT NULL

              GROUP BY
                lv.id_articulo
            ),

            top_actual AS (
              SELECT
                *
              FROM actual

              ORDER BY
                total_ventas_pvp_micros DESC,
                id_articulo

              LIMIT 50
            ),

            anterior AS (
              SELECT
                lv.id_articulo,

                SUM(
                  lv.pvp_micros * lv.unidades
                ) AS total_ventas_pvp_micros,

                SUM(
                  (
                    lv.pvp_micros -
                    lv.puc_micros
                  ) * lv.unidades
                ) AS total_beneficio_micros

              FROM linea_venta lv

              INNER JOIN venta v
                ON v.id = lv.id_venta

              WHERE
                v.deleted_at IS NULL
                AND v.created_at >= ?
                AND v.created_at < ?
                AND lv.id_articulo IS NOT NULL

              GROUP BY
                lv.id_articulo
            )

            SELECT
              top_actual.id_articulo,
              a.public_id AS articulo_public_id,
              m.nombre AS marca,
              a.nombre,

              top_actual.total_unidades_vendidas,
              top_actual.total_ventas_pvp_micros,
              top_actual.total_beneficio_micros,
              top_actual.numero_ventas_articulo,

              anterior.total_ventas_pvp_micros
                AS total_ventas_pvp_anterior_micros,

              anterior.total_beneficio_micros
                AS total_beneficio_anterior_micros

            FROM top_actual

            INNER JOIN articulo a
              ON a.id = top_actual.id_articulo

            INNER JOIN marca m
              ON m.id = a.id_marca

            LEFT JOIN anterior
              ON anterior.id_articulo =
                top_actual.id_articulo

            ORDER BY
              top_actual.total_ventas_pvp_micros DESC,
              top_actual.id_articulo
          `,
      [actualDesde, actualHastaExclusive, anteriorDesde, anteriorHastaExclusive],
    )) as readonly InformeDetalladoArticuloDatabaseRow[];

    const marcas: readonly InformeDetalladoMarcaRecord[] = marcasRows.map(
      (row: InformeDetalladoMarcaDatabaseRow): InformeDetalladoMarcaRecord => ({
        marcaPublicId: row.marca_public_id,
        nombre: row.nombre,
        totalVentasPvpMicros: row.total_ventas_pvp_micros,
        totalBeneficioMicros: row.total_beneficio_micros,
        totalVentasPvpAnteriorMicros: row.total_ventas_pvp_anterior_micros,
        totalBeneficioAnteriorMicros: row.total_beneficio_anterior_micros,
      }),
    );

    const articulos: readonly InformeDetalladoArticuloRecord[] = articulosRows.map(
      (row: InformeDetalladoArticuloDatabaseRow): InformeDetalladoArticuloRecord => ({
        idArticulo: row.id_articulo,
        articuloPublicId: row.articulo_public_id,
        marca: row.marca,
        nombre: row.nombre,
        totalUnidadesVendidas: row.total_unidades_vendidas,
        totalVentasPvpMicros: row.total_ventas_pvp_micros,
        totalBeneficioMicros: row.total_beneficio_micros,
        numeroVentasArticulo: row.numero_ventas_articulo,
        totalVentasPvpAnteriorMicros: row.total_ventas_pvp_anterior_micros,
        totalBeneficioAnteriorMicros: row.total_beneficio_anterior_micros,
      }),
    );

    return {
      actual,
      anterior,
      marcas,
      articulos,
    };
  }

  /**
   * Recupera el número de tickets y las magnitudes
   * económicas agregadas de un intervalo.
   */
  private async findResumen(
    dataSource: DataSource,
    desde: string,
    hastaExclusive: string,
  ): Promise<InformeDetalladoResumenRecord> {
    const rows: readonly InformeDetalladoResumenDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              (
                SELECT COUNT(*)
                FROM venta ventas_periodo
                WHERE
                  ventas_periodo.deleted_at IS NULL
                  AND ventas_periodo.created_at >= ?
                  AND ventas_periodo.created_at < ?
              ) AS numero_ventas,

              COALESCE(
                SUM(
                  CASE
                    WHEN
                      lv.id_articulo IS NOT NULL
                      OR lv.id_marca_snapshot IS NOT NULL
                    THEN
                      lv.pvp_micros * lv.unidades
                    ELSE 0
                  END
                ),
                0
              ) AS total_ventas_pvp_micros,

              COALESCE(
                SUM(
                  CASE
                    WHEN
                      lv.id_articulo IS NOT NULL
                      OR lv.id_marca_snapshot IS NOT NULL
                    THEN
                      (
                        lv.pvp_micros -
                        lv.puc_micros
                      ) * lv.unidades
                    ELSE 0
                  END
                ),
                0
              ) AS total_beneficio_micros

            FROM venta v

            LEFT JOIN linea_venta lv
              ON lv.id_venta = v.id

            WHERE
              v.deleted_at IS NULL
              AND v.created_at >= ?
              AND v.created_at < ?
          `,
      [desde, hastaExclusive, desde, hastaExclusive],
    )) as readonly InformeDetalladoResumenDatabaseRow[];

    const row: InformeDetalladoResumenDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('No se ha podido obtener el resumen del Informe Detallado.');
    }

    return {
      numeroVentas: row.numero_ventas,
      totalVentasPvpMicros: row.total_ventas_pvp_micros,
      totalBeneficioMicros: row.total_beneficio_micros,
    };
  }
}
