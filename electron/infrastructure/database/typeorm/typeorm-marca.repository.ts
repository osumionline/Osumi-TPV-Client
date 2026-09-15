import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaEstadisticasRepositoryQuery from '@backend/contracts/marcas/marca-estadisticas-query.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type {
  MarcaEstadisticasAggregateRecord,
  MarcaEstadisticasRepositoryResult,
} from '@backend/domain/marcas/marca-estadisticas-record.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import insertArchivo from '@infrastructure/database/typeorm/typeorm-archivo.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface MarcaEstadisticasAggregateDatabaseRow {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;
  readonly value: number;
}

interface MarcaEstadisticasYearDatabaseRow {
  readonly year: number;
}

interface MarcaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_archivo: number | null;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly foto_relative_path: string | null;
}

interface MarcaLogoPersistence {
  readonly idArchivo: number | null;
  readonly relativePath: string | null;
}

export default class TypeOrmMarcaRepository implements MarcaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly MarcaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly MarcaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              m.id,
              m.public_id,
              m.id_archivo,
              m.nombre,
              m.direccion,
              m.telefono,
              m.email,
              m.web,
              m.observaciones,
              a.relative_path
                AS foto_relative_path
            FROM marca m
            LEFT JOIN archivo a
              ON a.id = m.id_archivo
              AND a.deleted_at IS NULL
            WHERE
              m.deleted_at IS NULL
            ORDER BY
              m.nombre COLLATE NOCASE,
              m.id
          `,
    )) as readonly MarcaDatabaseRow[];

    return rows.map((row: MarcaDatabaseRow): MarcaRecord => this.toRecord(row));
  }

  /**
   * Recupera una marca activa por su identificador interno.
   */
  async findById(id: number): Promise<MarcaRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly MarcaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          m.id,
          m.public_id,
          m.id_archivo,
          m.nombre,
          m.direccion,
          m.telefono,
          m.email,
          m.web,
          m.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM marca m

        LEFT JOIN archivo a
          ON a.id = m.id_archivo
          AND a.deleted_at IS NULL

        WHERE
          m.id = ?
          AND m.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    )) as readonly MarcaDatabaseRow[];

    const row: MarcaDatabaseRow | undefined = rows[0];

    return row === undefined ? null : this.toRecord(row);
  }

  /**
   * Agrega las ventas históricas positivas de una Marca
   * según la granularidad temporal solicitada.
   */
  async findEstadisticas(
    query: MarcaEstadisticasRepositoryQuery,
  ): Promise<MarcaEstadisticasRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const yearExpression: string = "CAST(strftime('%Y', v.created_at) AS INTEGER)";

    const monthValueExpression: string = "CAST(strftime('%m', v.created_at) AS INTEGER)";

    const dayValueExpression: string = "CAST(strftime('%d', v.created_at) AS INTEGER)";

    const annual: boolean = query.year === null;

    const daily: boolean = query.year !== null && query.month !== null;

    const monthExpression: string = annual ? 'NULL' : monthValueExpression;

    const dayExpression: string = daily ? dayValueExpression : 'NULL';

    const valueExpression: string =
      query.metric === 'units' ? 'SUM(lv.unidades)' : 'SUM(lv.importe_micros)';

    const conditions: string[] = [
      'lv.id_marca_snapshot = ?',
      'lv.unidades > 0',
      'v.deleted_at IS NULL',
    ];

    const parameters: number[] = [query.idMarca];

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

    const rows: readonly MarcaEstadisticasAggregateDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ${yearExpression} AS year,
          ${monthExpression} AS month,
          ${dayExpression} AS day,
          ${valueExpression} AS value
        FROM linea_venta lv

        INNER JOIN venta v
          ON v.id = lv.id_venta

        WHERE
          ${conditions.join('\n          AND ')}

        GROUP BY
          ${groupByExpression}

        ORDER BY
          ${groupByExpression}
      `,
      parameters,
    )) as readonly MarcaEstadisticasAggregateDatabaseRow[];

    const yearRows: readonly MarcaEstadisticasYearDatabaseRow[] = (await dataSource.query(
      `
        SELECT DISTINCT
          ${yearExpression} AS year
        FROM linea_venta lv

        INNER JOIN venta v
          ON v.id = lv.id_venta

        WHERE
          lv.id_marca_snapshot = ?
          AND lv.unidades > 0
          AND v.deleted_at IS NULL

        ORDER BY
          year
      `,
      [query.idMarca],
    )) as readonly MarcaEstadisticasYearDatabaseRow[];

    return {
      years: yearRows.map((row: MarcaEstadisticasYearDatabaseRow): number => row.year),

      items: rows.map(
        (row: MarcaEstadisticasAggregateDatabaseRow): MarcaEstadisticasAggregateRecord => ({
          year: row.year,
          month: row.month,
          day: row.day,
          value: row.value,
        }),
      ),
    };
  }

  /**
   * Comprueba si existe otra marca activa con el mismo nombre.
   */
  async existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly {
      readonly total: number;
    }[] = (await dataSource.query(
      `
        SELECT
          COUNT(*) AS total
        FROM marca
        WHERE
          deleted_at IS NULL
          AND nombre = ? COLLATE NOCASE
          AND (
            ? IS NULL
            OR id <> ?
          )
      `,
      [nombre, excludeId, excludeId],
    )) as readonly {
      readonly total: number;
    }[];

    return (rows[0]?.total ?? 0) > 0;
  }

  /**
   * Crea una marca y, opcionalmente, un proveedor con
   * los mismos datos dentro de una única transacción.
   */
  async create(command: CrearMarcaRecordCommand): Promise<MarcaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const publicId: string = randomUUID();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<MarcaRecord> => {
        let idArchivo: number | null = null;

        if (command.nuevoLogo !== null) {
          this.validateNewBrandImage(command.nuevoLogo);

          idArchivo = await insertArchivo(queryRunner, command.nuevoLogo);
        }

        await queryRunner.query(
          `
            INSERT INTO marca (
              public_id,
              id_archivo,
              nombre,
              direccion,
              telefono,
              email,
              web,
              observaciones,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            publicId,
            idArchivo,
            command.nombre,
            command.direccion,
            command.telefono,
            command.email,
            command.web,
            command.observaciones,
            timestamp,
            timestamp,
          ],
        );

        const idMarca: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador de la marca creada.',
        );

        if (command.crearProveedor) {
          await this.createProveedorForMarca(queryRunner, idMarca, command, timestamp);
        }

        return {
          id: idMarca,
          publicId,
          nombre: command.nombre,
          direccion: command.direccion,
          fotoRelativePath: command.nuevoLogo?.relativePath ?? null,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
        };
      },
    );
  }

  /**
   * Actualiza los datos editables de una marca activa
   * sin modificar su logo ni sus relaciones externas.
   */
  async update(id: number, command: ActualizarMarcaRecordCommand): Promise<MarcaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<MarcaRecord> => {
        const currentRow: MarcaDatabaseRow = await this.requireActiveMarca(
          queryRunner,
          id,
          'La marca que se intenta actualizar no existe.',
        );

        const current: MarcaRecord = this.toRecord(currentRow);

        const logo: MarcaLogoPersistence = await this.resolveLogoUpdate(
          queryRunner,
          currentRow,
          command.logo,
        );

        await queryRunner.query(
          `
            UPDATE marca
            SET
              id_archivo = ?,
              nombre = ?,
              direccion = ?,
              telefono = ?,
              email = ?,
              web = ?,
              observaciones = ?,
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [
            logo.idArchivo,
            command.nombre,
            command.direccion,
            command.telefono,
            command.email,
            command.web,
            command.observaciones,
            timestamp,
            id,
          ],
        );

        return {
          ...current,
          nombre: command.nombre,
          direccion: command.direccion,
          fotoRelativePath: logo.relativePath,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
        };
      },
    );
  }

  /**
   * Da de baja una marca conservando todas sus
   * relaciones, su logo y su información histórica.
   */
  async deactivate(id: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const timestamp: string = new Date().toISOString();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveMarca(
        queryRunner,
        id,
        'La marca que se intenta eliminar no existe o ya está dada de baja.',
      );

      await queryRunner.query(
        `
            UPDATE marca
            SET
              deleted_at = ?,
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
        [timestamp, timestamp, id],
      );
    });
  }

  /**
   * Recupera una marca activa dentro de una transacción
   * o lanza el error indicado cuando no existe.
   */
  private async requireActiveMarca(
    queryRunner: QueryRunner,
    id: number,
    errorMessage: string,
  ): Promise<MarcaDatabaseRow> {
    const rows: readonly MarcaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          m.id,
          m.public_id,
          m.id_archivo,
          m.nombre,
          m.direccion,
          m.telefono,
          m.email,
          m.web,
          m.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM marca m

        LEFT JOIN archivo a
          ON a.id = m.id_archivo
          AND a.deleted_at IS NULL

        WHERE
          m.id = ?
          AND m.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    )) as readonly MarcaDatabaseRow[];

    const row: MarcaDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error(errorMessage);
    }

    return row;
  }

  /**
   * Resuelve qué archivo de logo debe quedar enlazado
   * después de actualizar la Marca.
   */
  private async resolveLogoUpdate(
    queryRunner: QueryRunner,
    current: MarcaDatabaseRow,
    logo: ActualizarMarcaRecordCommand['logo'],
  ): Promise<MarcaLogoPersistence> {
    switch (logo.action) {
      case 'keep':
        return {
          idArchivo: current.id_archivo,
          relativePath: current.foto_relative_path,
        };

      case 'remove':
        return {
          idArchivo: null,
          relativePath: null,
        };

      case 'replace':
        this.validateNewBrandImage(logo.nuevoArchivo);

        return {
          idArchivo: await insertArchivo(queryRunner, logo.nuevoArchivo),
          relativePath: logo.nuevoArchivo.relativePath,
        };
    }
  }

  /**
   * Comprueba que un archivo nuevo sea un WebP
   * preparado específicamente para logos de Marca.
   */
  private validateNewBrandImage(archivo: ArchivoCreateRecord): void {
    if (
      archivo.purpose !== 'brand_image' ||
      archivo.mimeType !== 'image/webp' ||
      !archivo.relativePath.startsWith('files/brands/')
    ) {
      throw new Error('El logo nuevo no pertenece al almacenamiento de imágenes de Marcas.');
    }
  }

  /**
   * Convierte una fila SQLite al record canónico de Marca.
   */
  private toRecord(row: MarcaDatabaseRow): MarcaRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      direccion: row.direccion,
      fotoRelativePath: row.foto_relative_path,
      telefono: row.telefono,
      email: row.email,
      web: row.web,
      observaciones: row.observaciones,
    };
  }

  /**
   * Crea el proveedor asociado a una nueva marca
   * y establece su relación N:M.
   */
  private async createProveedorForMarca(
    queryRunner: QueryRunner,
    idMarca: number,
    command: CrearMarcaRecordCommand,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO proveedor (
          public_id,
          nombre,
          direccion,
          telefono,
          email,
          web,
          observaciones,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        command.nombre,
        command.direccion,
        command.telefono,
        command.email,
        command.web,
        command.observaciones,
        timestamp,
        timestamp,
      ],
    );

    const idProveedor: number = await getLastInsertId(
      queryRunner,
      'No se ha podido obtener el identificador del proveedor creado.',
    );

    await queryRunner.query(
      `
        INSERT INTO proveedor_marca (
          id_proveedor,
          id_marca,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [idProveedor, idMarca, timestamp, timestamp],
    );
  }
}
