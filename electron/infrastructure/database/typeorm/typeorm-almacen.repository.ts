import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidad-query.interface';
import type InventarioFilterQuery from '@backend/contracts/almacen/inventario-filter-query.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadMarcaFilterRecord,
  CaducidadResultadoRecord,
  CaducidadRowRecord,
} from '@backend/domain/almacen/caducidad-record.interface';
import type {
  InventarioResultadoRecord,
  InventarioRowRecord,
} from '@backend/domain/almacen/inventario-record.interface';
import type {
  InventarioReportRecord,
  InventarioReportRowRecord,
} from '@backend/domain/almacen/inventario-report-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';
import HISTORICO_ARTICULO_TIPO from '@backend/domain/articulos/historico-articulo.constants';
import { MONEY_SCALE, UNIT_PRICE_SCALE } from '@backend/domain/database/database-schema.constants';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

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

interface InventarioUpdateDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly acceso_directo: number | null;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
}

interface DatabaseIdRow {
  readonly id: number;
}

interface InventarioReportDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly proveedor_nombre: string | null;
  readonly marca_nombre: string;
  readonly referencia: string | null;
  readonly nombre: string;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
}

interface InventarioReportCategoriaDatabaseRow {
  readonly id_articulo: number;
  readonly nombre: string;
}

interface InventarioReportBarcodeDatabaseRow {
  readonly id_articulo: number;
  readonly codigo: string;
}

interface CaducidadAggregateDatabaseRow {
  readonly total_rows: number;
  readonly total_unidades: number;
  readonly total_pvp_cents: number;
  readonly total_puc_micros: number;
}

interface CaducidadDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_articulo: number;
  readonly localizador_snapshot: number;
  readonly id_marca_snapshot: number;
  readonly marca_nombre_snapshot: string;
  readonly articulo_nombre_snapshot: string;
  readonly unidades: number;
  readonly pvp_cents: number;
  readonly puc_micros: number;
  readonly total_pvp_cents: number;
  readonly fecha_baja: string;
}

interface CaducidadYearDatabaseRow {
  readonly anio: number;
}

interface CaducidadBrandDatabaseRow {
  readonly id_marca: number;
  readonly nombre: string;
}

interface CaducidadSqlFilter {
  readonly clause: string;
  readonly parameters: (number | string)[];
}

interface CaducidadArticuloDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly id_marca: number;
  readonly marca_nombre: string;
  readonly nombre: string;
  readonly stock: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
}

interface CaducidadDeactivateDatabaseRow {
  readonly id: number;
  readonly id_articulo: number;
  readonly unidades: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly deleted_at: string | null;
  readonly stock: number;
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
   * Recupera una página de caducidades usando siempre
   * los valores históricos congelados en cada registro.
   */
  async searchCaducidades(query: CaducidadRepositoryQuery): Promise<CaducidadResultadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const filter: CaducidadSqlFilter = this.buildCaducidadFilter(query);

    const aggregateRows: readonly CaducidadAggregateDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            COUNT(*) AS total_rows,
            COALESCE(
              SUM(mc.unidades),
              0
            ) AS total_unidades,
            COALESCE(
              SUM(
                mc.unidades * mc.pvp_cents
              ),
              0
            ) AS total_pvp_cents,
            COALESCE(
              SUM(
                mc.unidades * mc.puc_micros
              ),
              0
            ) AS total_puc_micros
          FROM merma_caducidad mc
          WHERE
            ${filter.clause}
        `,
      filter.parameters,
    )) as readonly CaducidadAggregateDatabaseRow[];

    const aggregate: CaducidadAggregateDatabaseRow = aggregateRows[0] ?? {
      total_rows: 0,
      total_unidades: 0,
      total_pvp_cents: 0,
      total_puc_micros: 0,
    };

    const rows: readonly CaducidadDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          mc.id,
          mc.public_id,
          mc.id_articulo,
          mc.localizador_snapshot,
          mc.id_marca_snapshot,
          mc.marca_nombre_snapshot,
          mc.articulo_nombre_snapshot,
          mc.unidades,
          mc.pvp_cents,
          mc.puc_micros,
          (
            mc.unidades * mc.pvp_cents
          ) AS total_pvp_cents,
          mc.fecha_baja
        FROM merma_caducidad mc
        WHERE
          ${filter.clause}
        ORDER BY
          mc.fecha_baja DESC,
          mc.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...filter.parameters, query.limit, query.offset],
    )) as readonly CaducidadDatabaseRow[];

    return {
      rows: rows.map((row: CaducidadDatabaseRow): CaducidadRowRecord => this.mapCaducidadRow(row)),
      totalRows: aggregate.total_rows,
      totalUnidades: aggregate.total_unidades,
      totalPvpCents: aggregate.total_pvp_cents,
      totalPucMicros: aggregate.total_puc_micros,
    };
  }

  /**
   * Recupera años y marcas realmente presentes en
   * las caducidades activas.
   */
  async getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const yearRows: readonly CaducidadYearDatabaseRow[] = (await dataSource.query(
      `
          SELECT DISTINCT
            CAST(
              substr(
                fecha_baja,
                1,
                4
              ) AS INTEGER
            ) AS anio
          FROM merma_caducidad
          WHERE
            deleted_at IS NULL
            AND length(fecha_baja) >= 4
          ORDER BY
            anio DESC
        `,
    )) as readonly CaducidadYearDatabaseRow[];

    const brandRows: readonly CaducidadBrandDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            mc.id_marca_snapshot AS id_marca,
            (
              SELECT
                mc_nombre.marca_nombre_snapshot
              FROM merma_caducidad mc_nombre
              WHERE
                mc_nombre.deleted_at IS NULL
                AND
                mc_nombre.id_marca_snapshot =
                  mc.id_marca_snapshot
              ORDER BY
                mc_nombre.fecha_baja DESC,
                mc_nombre.id DESC
              LIMIT 1
            ) AS nombre
          FROM merma_caducidad mc
          WHERE
            mc.deleted_at IS NULL
          GROUP BY
            mc.id_marca_snapshot
          ORDER BY
            nombre COLLATE NOCASE,
            id_marca
        `,
    )) as readonly CaducidadBrandDatabaseRow[];

    return {
      anios: yearRows.map((row: CaducidadYearDatabaseRow): number => row.anio),
      marcas: brandRows.map((row: CaducidadBrandDatabaseRow): CaducidadMarcaFilterRecord => ({
        idMarca: row.id_marca,
        nombre: row.nombre,
      })),
    };
  }

  /**
   * Busca artículos activos con stock positivo utilizando
   * sus identificadores comerciales habituales.
   */
  async searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const pattern: string = `%${this.escapeLike(texto)}%`;

    const rows: readonly CaducidadArticuloDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            a.id,
            a.localizador,
            a.id_marca,
            m.nombre AS marca_nombre,
            a.nombre,
            a.stock,
            a.puc_micros,
            a.pvp_cents
          FROM articulo a
          INNER JOIN marca m
            ON m.id = a.id_marca
          WHERE
            a.deleted_at IS NULL
            AND a.stock > 0
            AND (
              CAST(a.localizador AS TEXT)
                LIKE ?
                ESCAPE '\\'
              OR a.nombre
                COLLATE NOCASE
                LIKE ?
                ESCAPE '\\'
              OR COALESCE(
                a.referencia,
                ''
              )
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
          ORDER BY
            a.nombre COLLATE NOCASE,
            a.localizador,
            a.id
          LIMIT 25
        `,
      [pattern, pattern, pattern, pattern],
    )) as readonly CaducidadArticuloDatabaseRow[];

    return rows.map((row: CaducidadArticuloDatabaseRow): CaducidadArticuloSearchRecord => ({
      id: row.id,
      localizador: row.localizador,
      marcaNombre: row.marca_nombre,
      nombre: row.nombre,
      stock: row.stock,
      pucMicros: row.puc_micros,
      pvpCents: row.pvp_cents,
    }));
  }

  /**
   * Registra una caducidad, actualiza el stock y crea
   * su histórico dentro de una única transacción.
   */
  async createCaducidad(command: CaducidadCreateRecord): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.createCaducidadTransaction(queryRunner, command);
    });
  }

  /**
   * Revierte una caducidad, restaura el stock y registra
   * el movimiento inverso dentro de una única transacción.
   */
  async deactivateCaducidad(idCaducidad: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.deactivateCaducidadTransaction(queryRunner, idCaducidad);
    });
  }

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
   * Recupera todas las filas persistidas de un conjunto filtrado
   * para exportación e impresión.
   */
  async getInventarioReport(query: InventarioFilterQuery): Promise<InventarioReportRecord> {
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

    const rows: readonly InventarioReportDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        a.id,
        a.localizador,
        p.nombre AS proveedor_nombre,
        m.nombre AS marca_nombre,
        a.referencia,
        a.nombre,
        a.stock,
        a.palb_micros,
        a.puc_micros,
        a.pvp_cents,
        a.margen_microporcentaje
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
    `,
      filter.parameters,
    )) as readonly InventarioReportDatabaseRow[];

    const categorias: Map<number, string[]> = await this.findReportCategories(dataSource, filter);

    const codigosBarras: Map<number, string[]> = await this.findReportBarcodes(dataSource, filter);

    return {
      rows: rows.map((row: InventarioReportDatabaseRow): InventarioReportRowRecord => ({
        localizador: row.localizador,
        proveedorNombre: row.proveedor_nombre,
        marcaNombre: row.marca_nombre,
        referencia: row.referencia,
        categorias: categorias.get(row.id) ?? [],
        nombre: row.nombre,
        stock: row.stock,
        precioAlbaranMicros: row.palb_micros,
        pucMicros: row.puc_micros,
        pvpCents: row.pvp_cents,
        margenMicroporcentaje: row.margen_microporcentaje,
        codigosBarrasAdicionales: codigosBarras.get(row.id) ?? [],
      })),
      totalRows: aggregate.total_rows,
      mediaMargenMicroporcentaje: aggregate.media_margen_microporcentaje,
      totalPucMicros: aggregate.total_puc_micros,
      totalPvpCents: aggregate.total_pvp_cents,
    };
  }

  /**
   * Persiste atómicamente todas las filas de Inventario indicadas.
   */
  async saveInventarioRows(commands: readonly InventarioSaveRecord[]): Promise<void> {
    if (commands.length === 0) {
      return;
    }

    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      for (const command of commands) {
        await this.saveInventarioRow(queryRunner, command);
      }
    });
  }

  /**
   * Da de baja lógicamente un artículo y todos sus códigos activos.
   */
  async deactivateArticulo(idArticulo: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveArticle(queryRunner, idArticulo);

      const timestamp: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE codigo_barras
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id_articulo = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, idArticulo],
      );

      await queryRunner.query(
        `
          UPDATE articulo
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, idArticulo],
      );
    });
  }

  /**
   * Ejecuta todos los pasos necesarios para registrar
   * una caducidad dentro de la transacción activa.
   */
  private async createCaducidadTransaction(
    queryRunner: QueryRunner,
    command: CaducidadCreateRecord,
  ): Promise<void> {
    const article: CaducidadArticuloDatabaseRow = await this.requireCaducidadArticulo(
      queryRunner,
      command.idArticulo,
    );

    if (command.unidades > article.stock) {
      throw new Error('No se pueden registrar más unidades caducadas que el stock disponible.');
    }

    const stockFinal: number = article.stock - command.unidades;

    if (!Number.isSafeInteger(stockFinal)) {
      throw new Error('El stock resultante supera el rango permitido.');
    }

    const publicId: string = randomUUID();

    await queryRunner.query(
      `
      INSERT INTO merma_caducidad (
        public_id,
        id_articulo,
        localizador_snapshot,
        id_marca_snapshot,
        marca_nombre_snapshot,
        articulo_nombre_snapshot,
        unidades,
        puc_micros,
        pvp_cents,
        fecha_baja,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
      [
        publicId,
        article.id,
        article.localizador,
        article.id_marca,
        article.marca_nombre,
        article.nombre,
        command.unidades,
        article.puc_micros,
        article.pvp_cents,
        command.fechaBaja,
        command.fechaBaja,
        command.fechaBaja,
      ],
    );

    const idRows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
        SELECT id
        FROM merma_caducidad
        WHERE public_id = ?
        LIMIT 1
      `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    const idCaducidad: number | undefined = idRows[0]?.id;

    if (idCaducidad === undefined) {
      throw new Error('No se ha podido identificar la caducidad creada.');
    }

    await queryRunner.query(
      `
      UPDATE articulo
      SET
        stock = ?,
        updated_at = ?
      WHERE
        id = ?
        AND deleted_at IS NULL
    `,
      [stockFinal, command.fechaBaja, article.id],
    );

    await this.insertCaducidadStockHistory(
      queryRunner,
      article.id,
      idCaducidad,
      article.stock,
      -command.unidades,
      stockFinal,
      article.puc_micros,
      article.pvp_cents,
      command.fechaBaja,
    );
  }

  /**
   * Ejecuta todos los pasos necesarios para revertir
   * una caducidad dentro de la transacción activa.
   */
  private async deactivateCaducidadTransaction(
    queryRunner: QueryRunner,
    idCaducidad: number,
  ): Promise<void> {
    const caducidad: CaducidadDeactivateDatabaseRow = await this.requireCaducidadForDeactivation(
      queryRunner,
      idCaducidad,
    );

    const stockFinal: number = caducidad.stock + caducidad.unidades;

    if (!Number.isSafeInteger(stockFinal)) {
      throw new Error('El stock resultante supera el rango permitido.');
    }

    const timestamp: string = new Date().toISOString();

    await queryRunner.query(
      `
        UPDATE articulo
        SET
          stock = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [stockFinal, timestamp, caducidad.id_articulo],
    );

    await this.insertCaducidadStockHistory(
      queryRunner,
      caducidad.id_articulo,
      caducidad.id,
      caducidad.stock,
      caducidad.unidades,
      stockFinal,
      caducidad.puc_micros,
      caducidad.pvp_cents,
      timestamp,
    );

    await queryRunner.query(
      `
        UPDATE merma_caducidad
        SET
          deleted_at = ?,
          updated_at = ?
        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [timestamp, timestamp, caducidad.id],
    );
  }

  /**
   * Recupera una caducidad junto al stock canónico actual
   * del artículo asociado, aunque este esté dado de baja.
   */
  private async requireCaducidadForDeactivation(
    queryRunner: QueryRunner,
    idCaducidad: number,
  ): Promise<CaducidadDeactivateDatabaseRow> {
    const rows: readonly CaducidadDeactivateDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          mc.id,
          mc.id_articulo,
          mc.unidades,
          mc.puc_micros,
          mc.pvp_cents,
          mc.deleted_at,
          a.stock
        FROM merma_caducidad mc
        INNER JOIN articulo a
          ON a.id = mc.id_articulo
        WHERE mc.id = ?
        LIMIT 1
      `,
      [idCaducidad],
    )) as readonly CaducidadDeactivateDatabaseRow[];

    const caducidad: CaducidadDeactivateDatabaseRow | undefined = rows[0];

    if (caducidad === undefined) {
      throw new Error('La caducidad indicada no existe.');
    }

    if (caducidad.deleted_at !== null) {
      throw new Error('La caducidad indicada ya ha sido eliminada.');
    }

    return caducidad;
  }

  /**
   * Recupera dentro de la transacción el estado canónico
   * del artículo que va a contabilizarse como caducado.
   */
  private async requireCaducidadArticulo(
    queryRunner: QueryRunner,
    idArticulo: number,
  ): Promise<CaducidadArticuloDatabaseRow> {
    const rows: readonly CaducidadArticuloDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            a.id,
            a.localizador,
            a.id_marca,
            m.nombre AS marca_nombre,
            a.nombre,
            a.stock,
            a.puc_micros,
            a.pvp_cents
          FROM articulo a
          INNER JOIN marca m
            ON m.id = a.id_marca
          WHERE
            a.id = ?
            AND a.deleted_at IS NULL
          LIMIT 1
        `,
      [idArticulo],
    )) as readonly CaducidadArticuloDatabaseRow[];

    const article: CaducidadArticuloDatabaseRow | undefined = rows[0];

    if (article === undefined) {
      throw new Error('El artículo seleccionado ya no está disponible.');
    }

    if (article.stock <= 0) {
      throw new Error(
        'El artículo seleccionado no tiene stock disponible para registrar una caducidad.',
      );
    }

    return article;
  }

  /**
   * Registra un movimiento de stock asociado
   * explícitamente a una caducidad.
   */
  private async insertCaducidadStockHistory(
    queryRunner: QueryRunner,
    idArticulo: number,
    idCaducidad: number,
    stockPrevio: number,
    diferencia: number,
    stockFinal: number,
    pucMicros: number,
    pvpCents: number,
    timestamp: string,
  ): Promise<void> {
    const pvpMicros: number = (pvpCents * UNIT_PRICE_SCALE) / MONEY_SCALE;

    if (!Number.isSafeInteger(pvpMicros)) {
      throw new Error('El PVP de la caducidad supera el rango permitido.');
    }

    await queryRunner.query(
      `
      INSERT INTO historico_articulo (
        public_id,
        id_articulo,
        tipo,
        stock_previo,
        diferencia,
        stock_final,
        id_merma_caducidad,
        puc_micros,
        pvp_micros,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
      [
        randomUUID(),
        idArticulo,
        HISTORICO_ARTICULO_TIPO.CADUCIDAD,
        stockPrevio,
        diferencia,
        stockFinal,
        idCaducidad,
        pucMicros,
        pvpMicros,
        timestamp,
        timestamp,
      ],
    );
  }

  /**
   * Obtiene las categorías persistidas de todos los artículos del reporte.
   */
  private async findReportCategories(
    dataSource: DataSource,
    filter: InventarioSqlFilter,
  ): Promise<Map<number, string[]>> {
    const result: Map<number, string[]> = new Map<number, string[]>();

    const rows: readonly InventarioReportCategoriaDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        ac.id_articulo,
        c.nombre
      FROM articulo a
      INNER JOIN articulo_categoria ac
        ON ac.id_articulo = a.id
      INNER JOIN categoria c
        ON c.id = ac.id_categoria
      WHERE
        ${filter.clause}
        AND c.deleted_at IS NULL
      ORDER BY
        a.localizador,
        a.id,
        c.nombre
    `,
      filter.parameters,
    )) as readonly InventarioReportCategoriaDatabaseRow[];

    for (const row of rows) {
      const current: string[] | undefined = result.get(row.id_articulo);

      if (current === undefined) {
        result.set(row.id_articulo, [row.nombre]);

        continue;
      }

      current.push(row.nombre);
    }

    return result;
  }

  /**
   * Obtiene los códigos adicionales activos de todos los artículos del reporte.
   */
  private async findReportBarcodes(
    dataSource: DataSource,
    filter: InventarioSqlFilter,
  ): Promise<Map<number, string[]>> {
    const result: Map<number, string[]> = new Map<number, string[]>();

    const rows: readonly InventarioReportBarcodeDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        cb.id_articulo,
        cb.codigo
      FROM articulo a
      INNER JOIN codigo_barras cb
        ON cb.id_articulo = a.id
      WHERE
        ${filter.clause}
        AND cb.por_defecto = 0
        AND cb.deleted_at IS NULL
      ORDER BY
        a.localizador,
        a.id,
        cb.id
    `,
      filter.parameters,
    )) as readonly InventarioReportBarcodeDatabaseRow[];

    for (const row of rows) {
      const current: string[] | undefined = result.get(row.id_articulo);

      if (current === undefined) {
        result.set(row.id_articulo, [row.codigo]);

        continue;
      }

      current.push(row.codigo);
    }

    return result;
  }

  /**
   * Construye los filtros de Caducidades exclusivamente
   * sobre los valores históricos del registro.
   */
  private buildCaducidadFilter(query: CaducidadFilterQuery): CaducidadSqlFilter {
    const conditions: string[] = ['mc.deleted_at IS NULL'];
    const parameters: (number | string)[] = [];

    if (query.anio !== null) {
      conditions.push('CAST(substr(mc.fecha_baja, 1, 4) AS INTEGER) = ?');
      parameters.push(query.anio);
    }

    if (query.mes !== null) {
      conditions.push('CAST(substr(mc.fecha_baja, 6, 2) AS INTEGER) = ?');
      parameters.push(query.mes);
    }

    if (query.idMarca !== null) {
      conditions.push('mc.id_marca_snapshot = ?');
      parameters.push(query.idMarca);
    }

    if (query.nombre !== null) {
      const pattern: string = `%${this.escapeLike(query.nombre)}%`;

      conditions.push(`
      mc.articulo_nombre_snapshot
        COLLATE NOCASE
        LIKE ?
        ESCAPE '\\'
    `);

      parameters.push(pattern);
    }

    return {
      clause: conditions.join('\n          AND '),
      parameters,
    };
  }

  /**
   * Construye los filtros SQL sin multiplicar las filas
   * de artículo mediante joins de relaciones N:M.
   */
  private buildFilter(query: InventarioFilterQuery): InventarioSqlFilter {
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
   * Convierte una fila SQLite al record histórico
   * de Caducidades.
   */
  private mapCaducidadRow(row: CaducidadDatabaseRow): CaducidadRowRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      idArticulo: row.id_articulo,
      localizador: row.localizador_snapshot,
      idMarca: row.id_marca_snapshot,
      marcaNombre: row.marca_nombre_snapshot,
      nombre: row.articulo_nombre_snapshot,
      unidades: row.unidades,
      pvpCents: row.pvp_cents,
      pucMicros: row.puc_micros,
      totalPvpCents: row.total_pvp_cents,
      fechaBaja: row.fecha_baja,
    };
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

  /**
   * Persiste una fila de Inventario usando el QueryRunner
   * perteneciente a la transacción global.
   */
  private async saveInventarioRow(
    queryRunner: QueryRunner,
    command: InventarioSaveRecord,
  ): Promise<void> {
    const current: InventarioUpdateDatabaseRow = await this.requireActiveArticle(
      queryRunner,
      command.idArticulo,
    );

    await this.requireActiveCategories(queryRunner, command.idsCategorias);

    if (command.codigoAdicional !== null) {
      await this.requireAvailableAdditionalBarcode(queryRunner, current, command.codigoAdicional);
    }

    const timestamp: string = new Date().toISOString();

    const categoriesChanged: boolean = await this.syncCategories(
      queryRunner,
      command.idArticulo,
      command.idsCategorias,
      timestamp,
    );

    const scalarChanged: boolean = await this.updateInventarioValues(
      queryRunner,
      current,
      command,
      timestamp,
    );

    let barcodeChanged: boolean = false;

    if (command.codigoAdicional !== null) {
      await this.insertAdditionalBarcode(
        queryRunner,
        command.idArticulo,
        command.codigoAdicional,
        timestamp,
      );

      barcodeChanged = true;
    }

    if (current.stock !== command.stock) {
      await this.insertManualStockHistory(queryRunner, command, current.stock, timestamp);
    }

    if (!scalarChanged && (categoriesChanged || barcodeChanged)) {
      await queryRunner.query(
        `
        UPDATE articulo
        SET updated_at = ?
        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
        [timestamp, command.idArticulo],
      );
    }
  }

  /**
   * Obtiene los campos necesarios de un artículo activo
   * antes de modificar Inventario.
   */
  private async requireActiveArticle(
    queryRunner: QueryRunner,
    idArticulo: number,
  ): Promise<InventarioUpdateDatabaseRow> {
    const rows: readonly InventarioUpdateDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          id,
          localizador,
          acceso_directo,
          stock,
          palb_micros,
          puc_micros,
          pvp_cents,
          margen_microporcentaje
        FROM articulo
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [idArticulo],
    )) as readonly InventarioUpdateDatabaseRow[];

    const row: InventarioUpdateDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('El artículo que se intenta actualizar no existe.');
    }

    return row;
  }

  /**
   * Garantiza que todas las categorías seleccionadas continúan activas.
   */
  private async requireActiveCategories(
    queryRunner: QueryRunner,
    idsCategorias: readonly number[],
  ): Promise<void> {
    if (idsCategorias.length === 0) {
      return;
    }

    const placeholders: string = idsCategorias.map((): string => '?').join(', ');

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
        SELECT id
        FROM categoria
        WHERE
          id IN (${placeholders})
          AND deleted_at IS NULL
      `,
      [...idsCategorias],
    )) as readonly DatabaseIdRow[];

    if (rows.length !== idsCategorias.length) {
      throw new Error('Una de las categorías seleccionadas ya no existe.');
    }
  }

  /**
   * Sincroniza las categorías explícitas del artículo.
   */
  private async syncCategories(
    queryRunner: QueryRunner,
    idArticulo: number,
    idsCategorias: readonly number[],
    timestamp: string,
  ): Promise<boolean> {
    const rows: readonly InventarioCategoriaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          id_articulo,
          id_categoria
        FROM articulo_categoria
        WHERE id_articulo = ?
      `,
      [idArticulo],
    )) as readonly InventarioCategoriaDatabaseRow[];

    const currentIds: Set<number> = new Set<number>(
      rows.map((row: InventarioCategoriaDatabaseRow): number => row.id_categoria),
    );
    const nextIds: Set<number> = new Set<number>(idsCategorias);

    let changed: boolean = false;

    for (const idCategoria of currentIds) {
      if (nextIds.has(idCategoria)) {
        continue;
      }

      await queryRunner.query(
        `
        DELETE FROM articulo_categoria
        WHERE
          id_articulo = ?
          AND id_categoria = ?
      `,
        [idArticulo, idCategoria],
      );

      changed = true;
    }

    for (const idCategoria of nextIds) {
      if (currentIds.has(idCategoria)) {
        continue;
      }

      await queryRunner.query(
        `
        INSERT INTO articulo_categoria (
          id_articulo,
          id_categoria,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
        [idArticulo, idCategoria, timestamp, timestamp],
      );

      changed = true;
    }

    return changed;
  }

  /**
   * Actualiza únicamente los campos escalares que realmente han cambiado.
   */
  private async updateInventarioValues(
    queryRunner: QueryRunner,
    current: InventarioUpdateDatabaseRow,
    command: InventarioSaveRecord,
    timestamp: string,
  ): Promise<boolean> {
    const assignments: string[] = [];
    const parameters: (number | string)[] = [];

    if (current.palb_micros !== command.precioAlbaranMicros) {
      assignments.push('palb_micros = ?');
      parameters.push(command.precioAlbaranMicros);
    }

    if (current.puc_micros !== command.pucMicros) {
      assignments.push('puc_micros = ?');
      parameters.push(command.pucMicros);
    }

    if (current.pvp_cents !== command.pvpCents) {
      assignments.push('pvp_cents = ?');
      parameters.push(command.pvpCents);
    }

    if (current.margen_microporcentaje !== command.margenMicroporcentaje) {
      assignments.push('margen_microporcentaje = ?');
      parameters.push(command.margenMicroporcentaje);
    }

    if (current.stock !== command.stock) {
      assignments.push('stock = ?');
      parameters.push(command.stock);
    }

    if (assignments.length === 0) {
      return false;
    }

    assignments.push('updated_at = ?');
    parameters.push(timestamp);
    parameters.push(command.idArticulo);

    await queryRunner.query(
      `
      UPDATE articulo
      SET
        ${assignments.join(',\n        ')}
      WHERE
        id = ?
        AND deleted_at IS NULL
    `,
      parameters,
    );

    return true;
  }

  /**
   * Comprueba que el nuevo código adicional no provoque
   * ninguna ambigüedad comercial.
   */
  private async requireAvailableAdditionalBarcode(
    queryRunner: QueryRunner,
    article: InventarioUpdateDatabaseRow,
    codigo: string,
  ): Promise<void> {
    const existingAdditional: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
        SELECT id
        FROM codigo_barras
        WHERE
          id_articulo = ?
          AND por_defecto = 0
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [article.id],
    )) as readonly DatabaseIdRow[];

    if (existingAdditional.length > 0) {
      throw new Error('El artículo ya tiene un código de barras adicional.');
    }

    const numericCode: number | null =
      /^\d+$/.test(codigo) && Number.isSafeInteger(Number(codigo)) ? Number(codigo) : null;

    if (
      numericCode !== null &&
      (numericCode === article.localizador || numericCode === article.acceso_directo)
    ) {
      throw new Error(
        'El código de barras coincide con el localizador o acceso directo del artículo.',
      );
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
        SELECT cb.id
        FROM codigo_barras cb
        WHERE
          cb.codigo = ?
          AND cb.deleted_at IS NULL

        UNION ALL

        SELECT a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND a.id <> ?
          AND ? IS NOT NULL
          AND (
            a.localizador = ?
            OR a.acceso_directo = ?
          )

        LIMIT 1
      `,
      [codigo, article.id, numericCode, numericCode, numericCode],
    )) as readonly DatabaseIdRow[];

    if (rows.length > 0) {
      throw new Error(`El código "${codigo}" ya está siendo utilizado.`);
    }
  }

  /**
   * Inserta el primer código adicional del artículo.
   */
  private async insertAdditionalBarcode(
    queryRunner: QueryRunner,
    idArticulo: number,
    codigo: string,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO codigo_barras (
        public_id,
        id_articulo,
        codigo,
        por_defecto,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 0, ?, ?)
    `,
      [randomUUID(), idArticulo, codigo, timestamp, timestamp],
    );
  }

  /**
   * Registra un cambio manual de stock realizado desde Inventario.
   */
  private async insertManualStockHistory(
    queryRunner: QueryRunner,
    command: InventarioSaveRecord,
    previousStock: number,
    timestamp: string,
  ): Promise<void> {
    const pvpMicros: number = (command.pvpCents * UNIT_PRICE_SCALE) / MONEY_SCALE;

    await queryRunner.query(
      `
      INSERT INTO historico_articulo (
        public_id,
        id_articulo,
        tipo,
        stock_previo,
        diferencia,
        stock_final,
        puc_micros,
        pvp_micros,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        randomUUID(),
        command.idArticulo,
        HISTORICO_ARTICULO_TIPO.ARTICULO,
        previousStock,
        command.stock - previousStock,
        command.stock,
        command.pucMicros,
        pvpMicros,
        timestamp,
        timestamp,
      ],
    );
  }
}
