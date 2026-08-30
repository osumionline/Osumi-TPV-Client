import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type {
  ArticuloCodigoBarrasRecord,
  ArticuloFotoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface ArticuloDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly id_marca: number;
  readonly id_proveedor: number | null;
  readonly referencia: string | null;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly pvp_descuento_cents: number | null;
  readonly iva_bps: number;
  readonly re_bps: number;
  readonly margen_microporcentaje: number;
  readonly margen_descuento_microporcentaje: number | null;
  readonly stock: number;
  readonly stock_min: number;
  readonly stock_max: number;
  readonly lote_optimo: number;
  readonly venta_online: number;
  readonly mostrar_en_web: number;
  readonly descripcion_corta: string | null;
  readonly descripcion: string | null;
  readonly observaciones: string | null;
  readonly mostrar_observaciones_pedidos: number;
  readonly mostrar_observaciones_ventas: number;
  readonly acceso_directo: number | null;
}

interface ArticuloIdDatabaseRow {
  readonly id: number;
}

interface ArticuloCategoriaDatabaseRow {
  readonly id_categoria: number;
}

interface ArticuloCodigoBarrasDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly codigo: string;
  readonly por_defecto: number;
}

interface ArticuloFotoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly original_name: string | null;
  readonly relative_path: string;
  readonly mime_type: string;
  readonly size_bytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly orden: number;
  readonly principal: number;
}

/**
 * Obtiene desde SQLite los datos de gestión de Artículos.
 */
export default class TypeOrmArticulosRepository implements ArticulosRepository {
  /**
   * Crea el repository sobre la base de datos principal.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene el detalle completo de un artículo activo.
   */
  async findById(idArticulo: number): Promise<ArticuloRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          a.id,
          a.public_id,
          a.localizador,
          a.nombre,
          a.id_marca,
          a.id_proveedor,
          a.referencia,
          a.palb_micros,
          a.puc_micros,
          a.pvp_cents,
          a.pvp_descuento_cents,
          a.iva_bps,
          a.re_bps,
          a.margen_microporcentaje,
          a.margen_descuento_microporcentaje,
          a.stock,
          a.stock_min,
          a.stock_max,
          a.lote_optimo,
          a.venta_online,
          a.mostrar_en_web,
          a.descripcion_corta,
          a.descripcion,
          a.observaciones,
          a.mostrar_observaciones_pedidos,
          a.mostrar_observaciones_ventas,
          a.acceso_directo
        FROM articulo a
        WHERE
          a.id = ?
          AND a.deleted_at IS NULL
        LIMIT 1
      `,
      [idArticulo],
    )) as readonly ArticuloDatabaseRow[];

    const row: ArticuloDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    const idsCategorias: readonly number[] = await this.findCategoryIds(dataSource, idArticulo);
    const codigosBarras: readonly ArticuloCodigoBarrasRecord[] = await this.findBarcodes(
      dataSource,
      idArticulo,
    );
    const fotos: readonly ArticuloFotoRecord[] = await this.findPhotos(dataSource, idArticulo);

    return this.mapArticulo(row, idsCategorias, codigosBarras, fotos);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras
   * y devuelve el identificador del artículo activo.
   */
  async resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloIdDatabaseRow[] =
      codigoNumerico === null
        ? await this.resolveBarcode(dataSource, codigo)
        : await this.resolveNumericCode(dataSource, codigo, codigoNumerico);

    return rows[0]?.id ?? null;
  }

  /**
   * Obtiene las categorías relacionadas con un artículo.
   */
  private async findCategoryIds(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly number[]> {
    const rows: readonly ArticuloCategoriaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ac.id_categoria
        FROM articulo_categoria ac
        WHERE ac.id_articulo = ?
        ORDER BY ac.id_categoria
      `,
      [idArticulo],
    )) as readonly ArticuloCategoriaDatabaseRow[];

    return rows.map((row: ArticuloCategoriaDatabaseRow): number => row.id_categoria);
  }

  /**
   * Obtiene los códigos de barras activos de un artículo.
   */
  private async findBarcodes(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly ArticuloCodigoBarrasRecord[]> {
    const rows: readonly ArticuloCodigoBarrasDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          cb.id,
          cb.public_id,
          cb.codigo,
          cb.por_defecto
        FROM codigo_barras cb
        WHERE
          cb.id_articulo = ?
          AND cb.deleted_at IS NULL
        ORDER BY
          cb.por_defecto DESC,
          cb.id
      `,
      [idArticulo],
    )) as readonly ArticuloCodigoBarrasDatabaseRow[];

    return rows.map((row: ArticuloCodigoBarrasDatabaseRow): ArticuloCodigoBarrasRecord => ({
      id: row.id,
      publicId: row.public_id,
      codigo: row.codigo,
      porDefecto: row.por_defecto === 1,
    }));
  }

  /**
   * Obtiene las imágenes activas relacionadas con un artículo.
   */
  private async findPhotos(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly ArticuloFotoRecord[]> {
    const rows: readonly ArticuloFotoDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ar.id,
          ar.public_id,
          ar.original_name,
          ar.relative_path,
          ar.mime_type,
          ar.size_bytes,
          ar.width,
          ar.height,
          aa.orden,
          aa.principal
        FROM articulo_archivo aa
        INNER JOIN archivo ar
          ON ar.id = aa.id_archivo
        WHERE
          aa.id_articulo = ?
          AND aa.tipo = 'imagen'
          AND ar.deleted_at IS NULL
        ORDER BY
          aa.orden,
          ar.id
      `,
      [idArticulo],
    )) as readonly ArticuloFotoDatabaseRow[];

    return rows.map((row: ArticuloFotoDatabaseRow): ArticuloFotoRecord => ({
      id: row.id,
      publicId: row.public_id,
      originalName: row.original_name,
      relativePath: row.relative_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      width: row.width,
      height: row.height,
      orden: row.orden,
      principal: row.principal === 1,
    }));
  }

  /**
   * Resuelve un código numérico priorizando acceso directo,
   * localizador y finalmente código de barras.
   */
  private async resolveNumericCode(
    dataSource: DataSource,
    codigo: string,
    codigoNumerico: number,
  ): Promise<readonly ArticuloIdDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND (
            a.acceso_directo = ?
            OR a.localizador = ?
            OR EXISTS (
              SELECT 1
              FROM codigo_barras cb
              WHERE
                cb.id_articulo = a.id
                AND cb.codigo = ?
                AND cb.deleted_at IS NULL
            )
          )
        ORDER BY
          CASE
            WHEN a.acceso_directo = ? THEN 0
            WHEN a.localizador = ? THEN 1
            ELSE 2
          END,
          a.id
        LIMIT 1
      `,
      [codigoNumerico, codigoNumerico, codigo, codigoNumerico, codigoNumerico],
    )) as readonly ArticuloIdDatabaseRow[];
  }

  /**
   * Resuelve un código no numérico exclusivamente como código de barras.
   */
  private async resolveBarcode(
    dataSource: DataSource,
    codigo: string,
  ): Promise<readonly ArticuloIdDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM codigo_barras cb
            WHERE
              cb.id_articulo = a.id
              AND cb.codigo = ?
              AND cb.deleted_at IS NULL
          )
        ORDER BY a.id
        LIMIT 1
      `,
      [codigo],
    )) as readonly ArticuloIdDatabaseRow[];
  }

  /**
   * Convierte las filas SQLite en el record completo de Artículos.
   */
  private mapArticulo(
    row: ArticuloDatabaseRow,
    idsCategorias: readonly number[],
    codigosBarras: readonly ArticuloCodigoBarrasRecord[],
    fotos: readonly ArticuloFotoRecord[],
  ): ArticuloRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      localizador: row.localizador,
      nombre: row.nombre,
      idMarca: row.id_marca,
      idProveedor: row.id_proveedor,
      idsCategorias,
      referencia: row.referencia,
      precioAlbaranMicros: row.palb_micros,
      pucMicros: row.puc_micros,
      pvpCents: row.pvp_cents,
      pvpDescuentoCents: row.pvp_descuento_cents,
      ivaBps: row.iva_bps,
      reBps: row.re_bps,
      margenMicroporcentaje: row.margen_microporcentaje,
      margenDescuentoMicroporcentaje: row.margen_descuento_microporcentaje,
      stock: row.stock,
      stockMin: row.stock_min,
      stockMax: row.stock_max,
      loteOptimo: row.lote_optimo,
      ventaOnline: row.venta_online === 1,
      mostrarEnWeb: row.mostrar_en_web === 1,
      descripcionCorta: row.descripcion_corta,
      descripcionLarga: row.descripcion,
      observaciones: row.observaciones,
      mostrarObservacionesPedidos: row.mostrar_observaciones_pedidos === 1,
      mostrarObservacionesVentas: row.mostrar_observaciones_ventas === 1,
      accesoDirecto: row.acceso_directo,
      codigosBarras,
      fotos,
    };
  }
}
