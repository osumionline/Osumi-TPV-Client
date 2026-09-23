import type InformeVentasRepository from '@backend/contracts/caja/informes/informe-ventas.repository.interface';
import type {
  InformeVentasArticuloCategoriaRecord,
  InformeVentasCategoriaRecord,
  InformeVentasLineaRecord,
  InformeVentasRepositoryResult,
} from '@backend/domain/caja/informes/informe-ventas-record.interface';
import type TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface CategoriaDatabaseRow {
  readonly id_categoria: number;
  readonly categoria_public_id: string;
  readonly id_padre: number | null;
  readonly nombre: string;
  readonly orden: number;
}

interface ArticuloCategoriaDatabaseRow {
  readonly id_articulo: number;
  readonly id_categoria: number;
}

interface LineaDatabaseRow {
  readonly id_linea: number;
  readonly id_articulo: number;
  readonly articulo_public_id: string;
  readonly id_marca_snapshot: number | null;
  readonly marca: string;
  readonly nombre_articulo: string;
  readonly importe_micros: number;
  readonly unidades: number;
  readonly pvp_micros: number;
  readonly puc_micros: number;
}

/**
 * Recupera de SQLite los datos base necesarios
 * para construir el Informe de Ventas.
 */
export default class TypeOrmInformeVentasRepository implements InformeVentasRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera categorías activas, clasificación
   * actual y líneas válidas sin multiplicarlas
   * por sus posibles categorías.
   */
  async findByPeriod(
    desde: string,
    hastaExclusive: string,
  ): Promise<InformeVentasRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const categoriaRows: readonly CategoriaDatabaseRow[] = (await dataSource.query(`
          SELECT
            c.id AS id_categoria,
            c.public_id AS categoria_public_id,
            c.id_padre,
            c.nombre,
            c.orden

          FROM categoria c

          WHERE
            c.deleted_at IS NULL

          ORDER BY
            c.orden,
            c.nombre COLLATE NOCASE,
            c.id
        `)) as readonly CategoriaDatabaseRow[];

    const articuloCategoriaRows: readonly ArticuloCategoriaDatabaseRow[] = (await dataSource.query(`
          SELECT
            ac.id_articulo,
            ac.id_categoria

          FROM articulo_categoria ac

          INNER JOIN categoria c
            ON c.id = ac.id_categoria
            AND c.deleted_at IS NULL

          ORDER BY
            ac.id_categoria,
            ac.id_articulo
        `)) as readonly ArticuloCategoriaDatabaseRow[];

    const lineaRows: readonly LineaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              lv.id AS id_linea,
              lv.id_articulo,
              a.public_id AS articulo_public_id,
              lv.id_marca_snapshot,
              lv.marca,
              lv.nombre_articulo,
              lv.importe_micros,
              lv.unidades,
              lv.pvp_micros,
              lv.puc_micros

            FROM linea_venta lv

            INNER JOIN venta v
              ON v.id = lv.id_venta

            INNER JOIN articulo a
              ON a.id = lv.id_articulo

            WHERE
              v.deleted_at IS NULL
              AND v.created_at >= ?
              AND v.created_at < ?
              AND lv.id_articulo IS NOT NULL

              AND EXISTS (
                SELECT 1

                FROM articulo_categoria ac

                INNER JOIN categoria c
                  ON c.id = ac.id_categoria
                  AND c.deleted_at IS NULL

                WHERE
                  ac.id_articulo = lv.id_articulo
              )

            ORDER BY
              lv.id
          `,
      [desde, hastaExclusive],
    )) as readonly LineaDatabaseRow[];

    const categorias: readonly InformeVentasCategoriaRecord[] = categoriaRows.map(
      (row: CategoriaDatabaseRow): InformeVentasCategoriaRecord => ({
        idCategoria: row.id_categoria,
        categoriaPublicId: row.categoria_public_id,
        idPadre: row.id_padre,
        nombre: row.nombre,
        orden: row.orden,
      }),
    );

    const articuloCategorias: readonly InformeVentasArticuloCategoriaRecord[] =
      articuloCategoriaRows.map(
        (row: ArticuloCategoriaDatabaseRow): InformeVentasArticuloCategoriaRecord => ({
          idArticulo: row.id_articulo,

          idCategoria: row.id_categoria,
        }),
      );

    const lineas: readonly InformeVentasLineaRecord[] = lineaRows.map(
      (row: LineaDatabaseRow): InformeVentasLineaRecord => ({
        idLinea: row.id_linea,
        idArticulo: row.id_articulo,
        articuloPublicId: row.articulo_public_id,
        idMarcaSnapshot: row.id_marca_snapshot,
        marca: row.marca,
        nombreArticulo: row.nombre_articulo,
        importeMicros: row.importe_micros,
        unidades: row.unidades,
        pvpMicros: row.pvp_micros,
        pucMicros: row.puc_micros,
      }),
    );

    return {
      categorias,
      articuloCategorias,
      lineas,
    };
  }
}
