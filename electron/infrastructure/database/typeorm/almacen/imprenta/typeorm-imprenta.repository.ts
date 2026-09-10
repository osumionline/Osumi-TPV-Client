import type ImprentaRepository from '@backend/contracts/almacen/imprenta/imprenta.repository.interface';
import type ImprentaArticuloSearchRecord from '@backend/domain/almacen/imprenta/imprenta-articulo-search-record.interface';
import type ImprentaPrintArticuloRecord from '@backend/domain/almacen/imprenta/imprenta-print-articulo-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import escapeLike from '@infrastructure/database/typeorm/typeorm-like.utils';
import type { DataSource } from 'typeorm';
import type ImprentaArticuloDatabaseRow from './typeorm-imprenta.repository.private';

/**
 * Gestiona las lecturas SQLite propias de Imprenta.
 */
export default class TypeOrmImprentaRepository implements ImprentaRepository {
  /**
   * Crea el repository sobre la base de datos principal.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Busca artículos activos para Imprenta por nombre,
   * localizador o cualquiera de sus códigos de barras.
   */
  async searchImprentaArticulos(
    texto: string,
    idsArticulosExcluidos: readonly number[],
  ): Promise<readonly ImprentaArticuloSearchRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const pattern: string = `%${escapeLike(texto)}%`;
    const exclusionClause: string =
      idsArticulosExcluidos.length === 0
        ? ''
        : `AND a.id NOT IN (${idsArticulosExcluidos.map((): string => '?').join(', ')})`;

    const rows: readonly ImprentaArticuloDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            a.id,
            a.localizador,
            m.nombre AS marca_nombre,
            a.nombre,
            a.pvp_cents
          FROM articulo a
          LEFT JOIN marca m
            ON m.id = a.id_marca
          WHERE
            a.deleted_at IS NULL
            AND (
              CAST(a.localizador AS TEXT)
                LIKE ?
                ESCAPE '\\'
              OR a.nombre
                COLLATE NOCASE
                LIKE ?
                ESCAPE '\\'
              OR EXISTS (
                SELECT 1
                FROM codigo_barras cb
                WHERE
                  cb.id_articulo = a.id
                  AND cb.deleted_at IS NULL
                  AND cb.codigo
                    COLLATE NOCASE
                    LIKE ?
                    ESCAPE '\\'
              )
            )
            ${exclusionClause}
          ORDER BY
            a.nombre COLLATE NOCASE,
            a.localizador,
            a.id
          LIMIT 25
        `,
      [pattern, pattern, pattern, ...idsArticulosExcluidos],
    )) as readonly ImprentaArticuloDatabaseRow[];

    return rows.map((row: ImprentaArticuloDatabaseRow): ImprentaArticuloSearchRecord => ({
      id: row.id,
      localizador: row.localizador,
      marcaNombre: row.marca_nombre,
      nombre: row.nombre,
      pvpCents: row.pvp_cents,
    }));
  }

  /**
   * Recupera desde SQLite los datos canónicos actuales
   * de los artículos que van a imprimirse.
   */
  async getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloRecord[]> {
    if (idsArticulos.length === 0) {
      return [];
    }

    const dataSource: DataSource = await this.applicationDatabase.connect();
    const placeholders: string = idsArticulos.map((): string => '?').join(', ');

    const rows: readonly ImprentaArticuloDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          a.id,
          a.localizador,
          m.nombre AS marca_nombre,
          a.nombre,
          a.pvp_cents
        FROM articulo a
        LEFT JOIN marca m
          ON m.id = a.id_marca
        WHERE
          a.deleted_at IS NULL
          AND a.id IN (${placeholders})
        ORDER BY
          a.id
      `,
      idsArticulos,
    )) as readonly ImprentaArticuloDatabaseRow[];

    return rows.map((row: ImprentaArticuloDatabaseRow): ImprentaPrintArticuloRecord => ({
      idArticulo: row.id,
      localizador: row.localizador,
      marcaNombre: row.marca_nombre,
      nombre: row.nombre,
      pvpCents: row.pvp_cents,
    }));
  }
}
