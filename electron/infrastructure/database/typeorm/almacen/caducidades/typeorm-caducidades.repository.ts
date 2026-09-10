import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidades/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidades/caducidad-query.interface';
import type CaducidadesRepository from '@backend/contracts/almacen/caducidades/caducidades.repository.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidades/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadMarcaFilterRecord,
  CaducidadResultadoRecord,
  CaducidadRowRecord,
} from '@backend/domain/almacen/caducidades/caducidad-record.interface';
import type {
  CaducidadReportAnioRecord,
  CaducidadReportMesRecord,
  CaducidadReportRecord,
} from '@backend/domain/almacen/caducidades/caducidad-report-record.interface';
import HISTORICO_ARTICULO_TIPO from '@backend/domain/articulos/historico-articulo.constants';
import { MONEY_SCALE, UNIT_PRICE_SCALE } from '@backend/domain/database/database-schema.constants';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import escapeLike from '@infrastructure/database/typeorm/typeorm-like.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import type {
  CaducidadAggregateDatabaseRow,
  CaducidadArticuloDatabaseRow,
  CaducidadBrandDatabaseRow,
  CaducidadDatabaseRow,
  CaducidadDeactivateDatabaseRow,
  CaducidadReportDatabaseRow,
  CaducidadReportMonthAccumulator,
  CaducidadReportYearAccumulator,
  CaducidadSqlFilter,
  CaducidadYearDatabaseRow,
  DatabaseIdRow,
} from './typeorm-caducidades.repository.private';

/**
 * Gestiona la persistencia SQLite propia de Caducidades.
 */
export default class TypeOrmCaducidadesRepository implements CaducidadesRepository {
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
   * Recupera las caducidades filtradas ya agrupadas
   * por año, mes y marca histórica.
   */
  async getCaducidadReport(query: CaducidadFilterQuery): Promise<CaducidadReportRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const filter: CaducidadSqlFilter = this.buildCaducidadFilter(query);

    const rows: readonly CaducidadReportDatabaseRow[] = (await dataSource.query(
      `
          WITH filtered AS (
            SELECT
              mc.id,
              CAST(
                substr(
                  mc.fecha_baja,
                  1,
                  4
                ) AS INTEGER
              ) AS anio,
              CAST(
                substr(
                  mc.fecha_baja,
                  6,
                  2
                ) AS INTEGER
              ) AS mes,
              mc.id_marca_snapshot AS id_marca,
              mc.marca_nombre_snapshot,
              mc.unidades,
              mc.pvp_cents,
              mc.puc_micros,
              mc.fecha_baja
            FROM merma_caducidad mc
            WHERE
              ${filter.clause}
          ),
          grouped AS (
            SELECT
              anio,
              mes,
              id_marca,
              SUM(unidades) AS unidades,
              SUM(
                unidades * pvp_cents
              ) AS total_pvp_cents,
              SUM(
                unidades * puc_micros
              ) AS total_puc_micros
            FROM filtered
            GROUP BY
              anio,
              mes,
              id_marca
          )
          SELECT
            g.anio,
            g.mes,
            g.id_marca,
            (
              SELECT
                f.marca_nombre_snapshot
              FROM filtered f
              WHERE
                f.anio = g.anio
                AND f.mes = g.mes
                AND f.id_marca = g.id_marca
              ORDER BY
                f.fecha_baja DESC,
                f.id DESC
              LIMIT 1
            ) AS marca_nombre,
            g.unidades,
            g.total_pvp_cents,
            g.total_puc_micros
          FROM grouped g
          ORDER BY
            g.anio DESC,
            g.mes DESC,
            marca_nombre COLLATE NOCASE,
            g.id_marca
        `,
      filter.parameters,
    )) as readonly CaducidadReportDatabaseRow[];

    const anios: CaducidadReportYearAccumulator[] = [];
    let currentYear: CaducidadReportYearAccumulator | null = null;
    let currentMonth: CaducidadReportMonthAccumulator | null = null;
    let totalUnidades: number = 0;
    let totalPvpCents: number = 0;
    let totalPucMicros: number = 0;

    for (const row of rows) {
      if (currentYear === null || currentYear.anio !== row.anio) {
        currentYear = {
          anio: row.anio,
          unidades: 0,
          totalPvpCents: 0,
          totalPucMicros: 0,
          meses: [],
        };
        anios.push(currentYear);
        currentMonth = null;
      }

      if (currentMonth === null || currentMonth.mes !== row.mes) {
        currentMonth = {
          mes: row.mes,
          unidades: 0,
          totalPvpCents: 0,
          totalPucMicros: 0,
          marcas: [],
        };
        currentYear.meses.push(currentMonth);
      }

      currentMonth.marcas.push({
        idMarca: row.id_marca,
        nombre: row.marca_nombre,
        unidades: row.unidades,
        totalPvpCents: row.total_pvp_cents,
        totalPucMicros: row.total_puc_micros,
      });

      currentMonth.unidades += row.unidades;
      currentMonth.totalPvpCents += row.total_pvp_cents;
      currentMonth.totalPucMicros += row.total_puc_micros;

      currentYear.unidades += row.unidades;
      currentYear.totalPvpCents += row.total_pvp_cents;
      currentYear.totalPucMicros += row.total_puc_micros;

      totalUnidades += row.unidades;
      totalPvpCents += row.total_pvp_cents;
      totalPucMicros += row.total_puc_micros;
    }

    return {
      anios: anios.map((anio: CaducidadReportYearAccumulator): CaducidadReportAnioRecord => ({
        anio: anio.anio,
        unidades: anio.unidades,
        totalPvpCents: anio.totalPvpCents,
        totalPucMicros: anio.totalPucMicros,
        meses: anio.meses.map((mes: CaducidadReportMonthAccumulator): CaducidadReportMesRecord => ({
          mes: mes.mes,
          unidades: mes.unidades,
          totalPvpCents: mes.totalPvpCents,
          totalPucMicros: mes.totalPucMicros,
          marcas: [...mes.marcas],
        })),
      })),
      totalUnidades,
      totalPvpCents,
      totalPucMicros,
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

    const pattern: string = `%${escapeLike(texto)}%`;

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
      const pattern: string = `%${escapeLike(query.nombre)}%`;

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
}
