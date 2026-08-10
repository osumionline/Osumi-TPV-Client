import type VentasArticulosRepository from '@backend/contracts/ventas/ventas-articulos.repository.interface';
import type {
  AccesoDirectoVentaRecord,
  ArticuloVentaRecord,
} from '@backend/domain/ventas/articulo-venta-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface ArticuloVentaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly marca: string;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly pvp_descuento_cents: number | null;
  readonly iva_bps: number;
  readonly stock: number;
  readonly fecha_caducidad: string | null;
  readonly observaciones: string | null;
  readonly mostrar_observaciones_ventas: number;
}

interface AccesoDirectoVentaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly acceso_directo: number;
  readonly nombre: string;
}

const ARTICLE_SELECT: string = `
  SELECT
    a.id,
    a.public_id,
    a.localizador,
    a.nombre,
    m.nombre AS marca,
    a.puc_micros,
    a.pvp_cents,
    a.pvp_descuento_cents,
    a.iva_bps,
    a.stock,
    a.fecha_caducidad,
    a.observaciones,
    a.mostrar_observaciones_ventas
  FROM articulo a
  INNER JOIN marca m
    ON m.id = a.id_marca
`;

/**
 * Obtiene desde SQLite los artículos necesarios para la operativa de ventas.
 */
export default class TypeOrmVentasArticulosRepository implements VentasArticulosRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Resuelve un artículo mediante acceso directo, localizador o código de barras.
   */
  async resolveByCode(
    codigo: string,
    codigoNumerico: number | null,
  ): Promise<ArticuloVentaRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloVentaDatabaseRow[] =
      codigoNumerico === null
        ? await this.resolveBarcode(dataSource, codigo)
        : await this.resolveNumericCode(dataSource, codigo, codigoNumerico);

    const row: ArticuloVentaDatabaseRow | undefined = rows[0];

    return row === undefined ? null : this.mapArticulo(row);
  }

  /**
   * Busca artículos activos por su slug y devuelve los datos necesarios para Ventas.
   */
  async search(searchPattern: string): Promise<readonly ArticuloVentaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloVentaDatabaseRow[] = (await dataSource.query(
      `
        ${ARTICLE_SELECT}
        WHERE
          a.deleted_at IS NULL
          AND a.slug LIKE ? COLLATE NOCASE
        ORDER BY
          a.nombre COLLATE NOCASE,
          a.id
      `,
      [searchPattern],
    )) as readonly ArticuloVentaDatabaseRow[];

    return rows.map((row: ArticuloVentaDatabaseRow): ArticuloVentaRecord => this.mapArticulo(row));
  }

  /**
   * Obtiene los accesos directos definidos para artículos activos.
   */
  async getAccesosDirectos(): Promise<readonly AccesoDirectoVentaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly AccesoDirectoVentaDatabaseRow[] = (await dataSource.query(`
        SELECT
          a.id,
          a.public_id,
          a.acceso_directo,
          a.nombre
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND a.acceso_directo IS NOT NULL
        ORDER BY
          a.acceso_directo,
          a.id
      `)) as readonly AccesoDirectoVentaDatabaseRow[];

    return rows.map((row: AccesoDirectoVentaDatabaseRow): AccesoDirectoVentaRecord => ({
      id: row.id,
      publicId: row.public_id,
      accesoDirecto: row.acceso_directo,
      nombre: row.nombre,
    }));
  }

  /**
   * Resuelve un código numérico dando prioridad al acceso directo y al localizador.
   */
  private async resolveNumericCode(
    dataSource: DataSource,
    codigo: string,
    codigoNumerico: number,
  ): Promise<readonly ArticuloVentaDatabaseRow[]> {
    return (await dataSource.query(
      `
        ${ARTICLE_SELECT}
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
    )) as readonly ArticuloVentaDatabaseRow[];
  }

  /**
   * Resuelve un código no numérico exclusivamente como código de barras.
   */
  private async resolveBarcode(
    dataSource: DataSource,
    codigo: string,
  ): Promise<readonly ArticuloVentaDatabaseRow[]> {
    return (await dataSource.query(
      `
        ${ARTICLE_SELECT}
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
    )) as readonly ArticuloVentaDatabaseRow[];
  }

  /**
   * Convierte una fila SQLite en el record utilizado por el caso de uso Ventas.
   */
  private mapArticulo(row: ArticuloVentaDatabaseRow): ArticuloVentaRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      localizador: row.localizador,
      nombre: row.nombre,
      marca: row.marca,
      pucMicros: row.puc_micros,
      pvpCents: row.pvp_cents,
      pvpDescuentoCents: row.pvp_descuento_cents,
      ivaBps: row.iva_bps,
      stock: row.stock,
      fechaCaducidad: row.fecha_caducidad,
      observaciones: row.observaciones,
      mostrarObservacionesVentas: row.mostrar_observaciones_ventas === 1,
    };
  }
}
