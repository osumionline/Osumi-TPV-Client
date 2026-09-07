import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type {
  InventarioResultadoRecord,
  InventarioRowRecord,
} from '@backend/domain/almacen/inventario-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface InventarioAggregateDatabaseRow {
  readonly total_rows: number;
  readonly media_margen_microporcentaje: number;
  readonly total_puc_micros: number;
  readonly total_pvp_cents: number;
}

interface InventarioDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly id_proveedor: number | null;
  readonly proveedor_nombre: string | null;
  readonly id_marca: number;
  readonly marca_nombre: string;
  readonly referencia: string | null;
  readonly nombre: string;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
  readonly iva_bps: number;
  readonly re_bps: number;
  readonly tiene_codigo_adicional: number;
  readonly sin_ventas_ultimos_12_meses: number;
}

interface InventarioCategoriaDatabaseRow {
  readonly id_articulo: number;
  readonly id_categoria: number;
}

interface InventarioSqlFilter {
  readonly clause: string;
  readonly parameters: (number | string)[];
}

/**
 * Obtiene desde SQLite los datos de gestión del módulo Almacén.
 */
export default class TypeOrmAlmacenRepository implements AlmacenRepository {
  /**
   * Crea el repository sobre la base de datos principal.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera la página solicitada y los agregados
   * correspondientes al conjunto filtrado completo.
   */
  async searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const filter: InventarioSqlFilter = this.buildFilter(query);

    const aggregateRows: readonly InventarioAggregateDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          COUNT(*) AS total_rows,
          COALESCE(
            AVG(a.margen_microporcentaje),
            0
          ) AS media_margen_microporcentaje,
          COALESCE(
            SUM(a.stock * a.puc_micros),
            0
          ) AS total_puc_micros,
          COALESCE(
            SUM(a.stock * a.pvp_cents),
            0
          ) AS total_pvp_cents
        FROM articulo a
        WHERE
          ${filter.clause}
      `,
      filter.parameters,
    )) as readonly InventarioAggregateDatabaseRow[];

    const aggregate: InventarioAggregateDatabaseRow = aggregateRows[0] ?? {
      total_rows: 0,
      media_margen_microporcentaje: 0,
      total_puc_micros: 0,
      total_pvp_cents: 0,
    };

    const rows: readonly InventarioDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          a.id,
          a.public_id,
          a.localizador,
          a.id_proveedor,
          p.nombre AS proveedor_nombre,
          a.id_marca,
          m.nombre AS marca_nombre,
          a.referencia,
          a.nombre,
          a.stock,
          a.palb_micros,
          a.puc_micros,
          a.pvp_cents,
          a.margen_microporcentaje,
          a.iva_bps,
          a.re_bps,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM codigo_barras cb_adicional
              WHERE
                cb_adicional.id_articulo = a.id
                AND cb_adicional.por_defecto = 0
                AND cb_adicional.deleted_at IS NULL
            )
            THEN 1
            ELSE 0
          END AS tiene_codigo_adicional,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM linea_venta lv
              INNER JOIN venta v
                ON v.id = lv.id_venta
              WHERE
                lv.id_articulo = a.id
                AND lv.unidades > 0
                AND v.deleted_at IS NULL
                AND v.created_at >= ?
            )
            THEN 0
            ELSE 1
          END AS sin_ventas_ultimos_12_meses
        FROM articulo a
        INNER JOIN marca m
          ON m.id = a.id_marca
        LEFT JOIN proveedor p
          ON p.id = a.id_proveedor
        WHERE
          ${filter.clause}
        ORDER BY
          a.localizador,
          a.id
        LIMIT ?
        OFFSET ?
      `,
      [query.ventasDesde, ...filter.parameters, query.limit, query.offset],
    )) as readonly InventarioDatabaseRow[];

    const idsCategorias: Map<number, number[]> = await this.findCategoryIds(
      dataSource,
      rows.map((row: InventarioDatabaseRow): number => row.id),
    );

    return {
      rows: rows.map((row: InventarioDatabaseRow): InventarioRowRecord =>
        this.mapInventarioRow(row, idsCategorias.get(row.id) ?? []),
      ),
      totalRows: aggregate.total_rows,
      mediaMargenMicroporcentaje: aggregate.media_margen_microporcentaje,
      totalPucMicros: aggregate.total_puc_micros,
      totalPvpCents: aggregate.total_pvp_cents,
    };
  }

  /**
   * Construye los filtros SQL sin multiplicar las filas
   * de artículo mediante joins de relaciones N:M.
   */
  private buildFilter(query: InventarioRepositoryQuery): InventarioSqlFilter {
    const conditions: string[] = ['a.deleted_at IS NULL'];
    const parameters: (number | string)[] = [];

    if (query.idProveedor !== null) {
      conditions.push('a.id_proveedor = ?');
      parameters.push(query.idProveedor);
    }

    if (query.idMarca !== null) {
      conditions.push('a.id_marca = ?');
      parameters.push(query.idMarca);
    }

    if (query.idCategoria !== null) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM articulo_categoria ac_filtro
          WHERE
            ac_filtro.id_articulo = a.id
            AND ac_filtro.id_categoria = ?
        )
      `);
      parameters.push(query.idCategoria);
    }

    if (query.texto !== null) {
      const pattern: string = `%${this.escapeLike(query.texto)}%`;

      conditions.push(`
        (
          CAST(a.localizador AS TEXT) LIKE ? ESCAPE '\\'
          OR a.nombre COLLATE NOCASE LIKE ? ESCAPE '\\'
          OR COALESCE(a.referencia, '') COLLATE NOCASE LIKE ? ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM codigo_barras cb_busqueda
            WHERE
              cb_busqueda.id_articulo = a.id
              AND cb_busqueda.deleted_at IS NULL
              AND cb_busqueda.codigo COLLATE NOCASE LIKE ? ESCAPE '\\'
          )
          OR EXISTS (
            SELECT 1
            FROM articulo_etiqueta ae
            INNER JOIN etiqueta e
              ON e.id = ae.id_etiqueta
            WHERE
              ae.id_articulo = a.id
              AND e.deleted_at IS NULL
              AND e.texto COLLATE NOCASE LIKE ? ESCAPE '\\'
          )
        )
      `);

      parameters.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (query.conDescuento) {
      conditions.push('a.pvp_descuento_cents IS NOT NULL');
    }

    return {
      clause: conditions.join('\n          AND '),
      parameters,
    };
  }

  /**
   * Obtiene en una única consulta las categorías
   * de todos los artículos de la página actual.
   */
  private async findCategoryIds(
    dataSource: DataSource,
    idsArticulos: readonly number[],
  ): Promise<Map<number, number[]>> {
    const result: Map<number, number[]> = new Map<number, number[]>();

    if (idsArticulos.length === 0) {
      return result;
    }

    const placeholders: string = idsArticulos.map((): string => '?').join(', ');
    const rows: readonly InventarioCategoriaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ac.id_articulo,
          ac.id_categoria
        FROM articulo_categoria ac
        WHERE
          ac.id_articulo IN (${placeholders})
        ORDER BY
          ac.id_articulo,
          ac.id_categoria
      `,
      [...idsArticulos],
    )) as readonly InventarioCategoriaDatabaseRow[];

    for (const row of rows) {
      const current: number[] | undefined = result.get(row.id_articulo);

      if (current === undefined) {
        result.set(row.id_articulo, [row.id_categoria]);

        continue;
      }

      current.push(row.id_categoria);
    }

    return result;
  }

  /**
   * Escapa caracteres especiales utilizados por LIKE.
   */
  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  /**
   * Convierte una fila SQLite al record de Inventario.
   */
  private mapInventarioRow(
    row: InventarioDatabaseRow,
    idsCategorias: readonly number[],
  ): InventarioRowRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      localizador: row.localizador,
      idProveedor: row.id_proveedor,
      proveedorNombre: row.proveedor_nombre,
      idMarca: row.id_marca,
      marcaNombre: row.marca_nombre,
      referencia: row.referencia,
      idsCategorias: [...idsCategorias],
      nombre: row.nombre,
      stock: row.stock,
      precioAlbaranMicros: row.palb_micros,
      pucMicros: row.puc_micros,
      pvpCents: row.pvp_cents,
      margenMicroporcentaje: row.margen_microporcentaje,
      ivaBps: row.iva_bps,
      reBps: row.re_bps,
      tieneCodigoAdicional: row.tiene_codigo_adicional === 1,
      sinVentasUltimos12Meses: row.sin_ventas_ultimos_12_meses === 1,
    };
  }
}
