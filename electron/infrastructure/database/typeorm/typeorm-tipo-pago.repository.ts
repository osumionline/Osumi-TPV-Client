import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
import type TipoPagoEstadisticasRepositoryQuery from '@backend/contracts/tipos-pago/tipo-pago-estadisticas-query.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type {
  TipoPagoEstadisticasAggregateRecord,
  TipoPagoEstadisticasRepositoryResult,
} from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import insertArchivo from '@infrastructure/database/typeorm/typeorm-archivo.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

const EFECTIVO_SLUG: string = 'efectivo';

interface TipoPagoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_archivo: number | null;
  readonly nombre: string;
  readonly slug: string;
  readonly afecta_caja: number;
  readonly orden: number;
  readonly fisico: number;
  readonly foto_relative_path: string | null;
}

interface NextOrderDatabaseRow {
  readonly next_order: number;
}

interface TipoPagoEstadisticasAggregateDatabaseRow {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;
  readonly importe_cents: number;
}

interface TipoPagoEstadisticasYearDatabaseRow {
  readonly year: number;
}

interface TipoPagoEstadisticasSummaryDatabaseRow {
  readonly total_importe_cents: number;
  readonly operaciones: number;
}

interface TipoPagoEstadisticasGlobalDatabaseRow {
  readonly total_global_cents: number;
}

export default class TypeOrmTipoPagoRepository implements TipoPagoRepository {
  /**
   * Crea el repository de Tipos de pago.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera todos los tipos de pago activos
   * ordenados por su prioridad.
   */
  async findAll(): Promise<readonly TipoPagoRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly TipoPagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            tp.id,
            tp.public_id,
            tp.id_archivo,
            tp.nombre,
            tp.slug,
            tp.afecta_caja,
            tp.orden,
            tp.fisico,
            a.relative_path
              AS foto_relative_path
          FROM tipo_pago tp

          LEFT JOIN archivo a
            ON a.id = tp.id_archivo
            AND a.deleted_at IS NULL

          WHERE
            tp.activo = 1
            AND tp.deleted_at IS NULL

          ORDER BY
            tp.orden,
            tp.nombre COLLATE NOCASE,
            tp.id
        `,
    )) as readonly TipoPagoDatabaseRow[];

    return rows.map((row: TipoPagoDatabaseRow): TipoPagoRecord => this.toRecord(row));
  }

  /**
   * Recupera un tipo de pago activo
   * por su identificador interno.
   */
  async findById(id: number): Promise<TipoPagoRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly TipoPagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            tp.id,
            tp.public_id,
            tp.id_archivo,
            tp.nombre,
            tp.slug,
            tp.afecta_caja,
            tp.orden,
            tp.fisico,
            a.relative_path
              AS foto_relative_path
          FROM tipo_pago tp

          LEFT JOIN archivo a
            ON a.id = tp.id_archivo
            AND a.deleted_at IS NULL

          WHERE
            tp.id = ?
            AND tp.activo = 1
            AND tp.deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    )) as readonly TipoPagoDatabaseRow[];

    const row: TipoPagoDatabaseRow | undefined = rows[0];

    return row === undefined ? null : this.toRecord(row);
  }

  /**
   * Recupera la evolución y el resumen histórico
   * de un tipo de pago para el período solicitado.
   */
  async findEstadisticas(
    query: TipoPagoEstadisticasRepositoryQuery,
  ): Promise<TipoPagoEstadisticasRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const yearExpression: string = "CAST(strftime('%Y', v.created_at) AS INTEGER)";

    const monthValueExpression: string = "CAST(strftime('%m', v.created_at) AS INTEGER)";

    const dayValueExpression: string = "CAST(strftime('%d', v.created_at) AS INTEGER)";

    const annual: boolean = query.year === null;

    const daily: boolean = query.year !== null && query.month !== null;

    const monthExpression: string = annual ? 'NULL' : monthValueExpression;

    const dayExpression: string = daily ? dayValueExpression : 'NULL';

    const conditions: string[] = ['vp.id_tipo_pago = ?', 'v.deleted_at IS NULL'];

    const parameters: number[] = [query.idTipoPago];

    if (query.year !== null) {
      conditions.push(`${yearExpression} = ?`);

      parameters.push(query.year);
    }

    if (query.month !== null) {
      conditions.push(`${monthValueExpression} = ?`);

      parameters.push(query.month);
    }

    const groupByExpression: string = annual
      ? yearExpression
      : daily
        ? `${yearExpression}, ${monthValueExpression}, ${dayValueExpression}`
        : `${yearExpression}, ${monthValueExpression}`;

    const aggregateRows: readonly TipoPagoEstadisticasAggregateDatabaseRow[] =
      (await dataSource.query(
        `
        SELECT
          ${yearExpression} AS year,
          ${monthExpression} AS month,
          ${dayExpression} AS day,
          SUM(vp.importe_cents)
            AS importe_cents
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        WHERE
          ${conditions.join('\n          AND ')}

        GROUP BY
          ${groupByExpression}

        ORDER BY
          ${groupByExpression}
      `,
        parameters,
      )) as readonly TipoPagoEstadisticasAggregateDatabaseRow[];

    const yearRows: readonly TipoPagoEstadisticasYearDatabaseRow[] = (await dataSource.query(
      `
        SELECT DISTINCT
          ${yearExpression} AS year
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        WHERE
          vp.id_tipo_pago = ?
          AND v.deleted_at IS NULL

        ORDER BY
          year
      `,
      [query.idTipoPago],
    )) as readonly TipoPagoEstadisticasYearDatabaseRow[];

    const summaryRows: readonly TipoPagoEstadisticasSummaryDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          COALESCE(
            SUM(vp.importe_cents),
            0
          ) AS total_importe_cents,

          COUNT(
            DISTINCT vp.id_venta
          ) AS operaciones
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        WHERE
          ${conditions.join('\n          AND ')}
      `,
      parameters,
    )) as readonly TipoPagoEstadisticasSummaryDatabaseRow[];

    const globalConditions: string[] = ['v.deleted_at IS NULL'];

    const globalParameters: number[] = [];

    if (query.year !== null) {
      globalConditions.push(`${yearExpression} = ?`);

      globalParameters.push(query.year);
    }

    if (query.month !== null) {
      globalConditions.push(`${monthValueExpression} = ?`);

      globalParameters.push(query.month);
    }

    const globalRows: readonly TipoPagoEstadisticasGlobalDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          COALESCE(
            SUM(vp.importe_cents),
            0
          ) AS total_global_cents
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        WHERE
          ${globalConditions.join('\n          AND ')}
      `,
      globalParameters,
    )) as readonly TipoPagoEstadisticasGlobalDatabaseRow[];

    const summary: TipoPagoEstadisticasSummaryDatabaseRow | undefined = summaryRows[0];

    return {
      years: yearRows.map((row: TipoPagoEstadisticasYearDatabaseRow): number => row.year),

      items: aggregateRows.map(
        (row: TipoPagoEstadisticasAggregateDatabaseRow): TipoPagoEstadisticasAggregateRecord => ({
          year: row.year,
          month: row.month,
          day: row.day,
          importeCents: row.importe_cents,
        }),
      ),

      totalImporteCents: summary?.total_importe_cents ?? 0,

      operaciones: summary?.operaciones ?? 0,

      totalGlobalCents: globalRows[0]?.total_global_cents ?? 0,
    };
  }

  /**
   * Comprueba si existe otro tipo de pago
   * activo con el slug indicado.
   */
  async existsActiveBySlug(slug: string, excludeId: number | null): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly {
      readonly total: number;
    }[] = (await dataSource.query(
      `
          SELECT
            COUNT(*) AS total
          FROM tipo_pago

          WHERE
            activo = 1
            AND deleted_at IS NULL
            AND slug = ? COLLATE NOCASE
            AND (
              ? IS NULL
              OR id <> ?
            )
        `,
      [slug, excludeId, excludeId],
    )) as readonly {
      readonly total: number;
    }[];

    return (rows[0]?.total ?? 0) > 0;
  }

  /**
   * Crea un tipo de pago activo al final
   * del orden actual y enlaza su logo.
   */
  async create(command: CrearTipoPagoRecordCommand): Promise<TipoPagoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const publicId: string = randomUUID();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<TipoPagoRecord> => {
        this.validateNewPaymentTypeImage(command.nuevoLogo);

        const idArchivo: number = await insertArchivo(queryRunner, command.nuevoLogo);

        const orden: number = await this.getNextOrder(queryRunner);

        await queryRunner.query(
          `
            INSERT INTO tipo_pago (
              public_id,
              id_archivo,
              nombre,
              slug,
              afecta_caja,
              orden,
              fisico,
              activo,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              1,
              ?,
              ?,
              NULL
            )
          `,
          [
            publicId,
            idArchivo,
            command.nombre,
            command.slug,
            command.afectaCaja ? 1 : 0,
            orden,
            command.fisico ? 1 : 0,
            timestamp,
            timestamp,
          ],
        );

        const idTipoPago: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del tipo de pago creado.',
        );

        return {
          id: idTipoPago,
          publicId,
          nombre: command.nombre,
          slug: command.slug,
          fotoRelativePath: command.nuevoLogo.relativePath,
          afectaCaja: command.afectaCaja,
          orden,
          fisico: command.fisico,
        };
      },
    );
  }

  /**
   * Actualiza un tipo de pago activo
   * conservando su posición configurada.
   */
  async update(id: number, command: ActualizarTipoPagoRecordCommand): Promise<TipoPagoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<TipoPagoRecord> => {
        const currentRow: TipoPagoDatabaseRow = await this.requireActiveTipoPago(
          queryRunner,
          id,
          'El tipo de pago que se intenta actualizar no existe.',
        );

        let idArchivo: number | null = currentRow.id_archivo;

        let fotoRelativePath: string | null = currentRow.foto_relative_path;

        if (command.nuevoLogo !== null) {
          this.validateNewPaymentTypeImage(command.nuevoLogo);

          idArchivo = await insertArchivo(queryRunner, command.nuevoLogo);

          fotoRelativePath = command.nuevoLogo.relativePath;
        }

        await queryRunner.query(
          `
            UPDATE tipo_pago
            SET
              id_archivo = ?,
              nombre = ?,
              slug = ?,
              afecta_caja = ?,
              fisico = ?,
              updated_at = ?
            WHERE
              id = ?
              AND activo = 1
              AND deleted_at IS NULL
          `,
          [
            idArchivo,
            command.nombre,
            command.slug,
            command.afectaCaja ? 1 : 0,
            command.fisico ? 1 : 0,
            timestamp,
            id,
          ],
        );

        return {
          id: currentRow.id,
          publicId: currentRow.public_id,
          nombre: command.nombre,
          slug: command.slug,
          fotoRelativePath,
          afectaCaja: command.afectaCaja,
          orden: currentRow.orden,
          fisico: command.fisico,
        };
      },
    );
  }

  /**
   * Persiste el orden completo de los tipos de pago
   * configurables dentro de una única transacción.
   *
   * Efectivo permanece siempre fuera del orden editable
   * y conserva su posición estructural.
   */
  async reorder(ids: readonly number[]): Promise<readonly TipoPagoRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<readonly TipoPagoRecord[]> => {
        const currentRows: readonly TipoPagoDatabaseRow[] =
          await this.findAllActiveRows(queryRunner);

        const configurableRows: readonly TipoPagoDatabaseRow[] = currentRows.filter(
          (row: TipoPagoDatabaseRow): boolean =>
            row.slug.toLocaleLowerCase('es-ES') !== EFECTIVO_SLUG,
        );

        const configurableIds: ReadonlySet<number> = new Set<number>(
          configurableRows.map((row: TipoPagoDatabaseRow): number => row.id),
        );

        const uniqueIds: ReadonlySet<number> = new Set<number>(ids);

        const matchesCurrentMaster: boolean =
          ids.length === configurableRows.length &&
          uniqueIds.size === ids.length &&
          ids.every((id: number): boolean => configurableIds.has(id));

        if (!matchesCurrentMaster) {
          throw new Error(
            'El orden recibido no coincide con los tipos de pago configurables activos.',
          );
        }

        for (let index: number = 0; index < ids.length; index++) {
          await queryRunner.query(
            `
            UPDATE tipo_pago
            SET
              orden = ?,
              updated_at = ?
            WHERE
              id = ?
              AND activo = 1
              AND deleted_at IS NULL
          `,
            [index + 1, timestamp, ids[index]],
          );
        }

        const updatedRows: readonly TipoPagoDatabaseRow[] =
          await this.findAllActiveRows(queryRunner);

        return updatedRows.map((row: TipoPagoDatabaseRow): TipoPagoRecord => this.toRecord(row));
      },
    );
  }

  /**
   * Da de baja lógicamente un tipo de pago
   * sin eliminar su registro ni su logo.
   */
  async deactivate(id: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveTipoPago(
        queryRunner,
        id,
        'El tipo de pago que se intenta eliminar no existe o ya está dado de baja.',
      );

      await queryRunner.query(
        `
            UPDATE tipo_pago
            SET
              activo = 0,
              updated_at = ?,
              deleted_at = ?
            WHERE
              id = ?
              AND activo = 1
              AND deleted_at IS NULL
          `,
        [timestamp, timestamp, id],
      );
    });
  }

  /**
   * Recupera el maestro activo dentro de una
   * transacción respetando su orden persistido.
   */
  private async findAllActiveRows(
    queryRunner: QueryRunner,
  ): Promise<readonly TipoPagoDatabaseRow[]> {
    return (await queryRunner.query(
      `
      SELECT
        tp.id,
        tp.public_id,
        tp.id_archivo,
        tp.nombre,
        tp.slug,
        tp.afecta_caja,
        tp.orden,
        tp.fisico,
        a.relative_path
          AS foto_relative_path
      FROM tipo_pago tp

      LEFT JOIN archivo a
        ON a.id = tp.id_archivo
        AND a.deleted_at IS NULL

      WHERE
        tp.activo = 1
        AND tp.deleted_at IS NULL

      ORDER BY
        tp.orden,
        tp.nombre COLLATE NOCASE,
        tp.id
    `,
    )) as readonly TipoPagoDatabaseRow[];
  }

  /**
   * Calcula el orden que debe recibir
   * un nuevo tipo de pago.
   */
  private async getNextOrder(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly NextOrderDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            COALESCE(
              MAX(orden),
              0
            ) + 1
              AS next_order
          FROM tipo_pago
          WHERE
            activo = 1
            AND deleted_at IS NULL
        `,
    )) as readonly NextOrderDatabaseRow[];

    return rows[0]?.next_order ?? 1;
  }

  /**
   * Recupera un tipo de pago activo dentro
   * de una transacción o lanza el error indicado.
   */
  private async requireActiveTipoPago(
    queryRunner: QueryRunner,
    id: number,
    errorMessage: string,
  ): Promise<TipoPagoDatabaseRow> {
    const rows: readonly TipoPagoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            tp.id,
            tp.public_id,
            tp.id_archivo,
            tp.nombre,
            tp.slug,
            tp.afecta_caja,
            tp.orden,
            tp.fisico,
            a.relative_path
              AS foto_relative_path
          FROM tipo_pago tp

          LEFT JOIN archivo a
            ON a.id = tp.id_archivo
            AND a.deleted_at IS NULL

          WHERE
            tp.id = ?
            AND tp.activo = 1
            AND tp.deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    )) as readonly TipoPagoDatabaseRow[];

    const row: TipoPagoDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error(errorMessage);
    }

    return row;
  }

  /**
   * Comprueba que el archivo recibido sea
   * un WebP preparado para Tipos de pago.
   */
  private validateNewPaymentTypeImage(archivo: ArchivoCreateRecord): void {
    if (
      archivo.purpose !== 'payment_type_icon' ||
      archivo.mimeType !== 'image/webp' ||
      !archivo.relativePath.startsWith('files/payment-types/')
    ) {
      throw new Error('El logo nuevo no pertenece al almacenamiento de imágenes de Tipos de pago.');
    }
  }

  /**
   * Convierte una fila SQLite al record
   * canónico de Tipo de pago.
   */
  private toRecord(row: TipoPagoDatabaseRow): TipoPagoRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      slug: row.slug,
      fotoRelativePath: row.foto_relative_path,
      afectaCaja: row.afecta_caja === 1,
      orden: row.orden,
      fisico: row.fisico === 1,
    };
  }
}
