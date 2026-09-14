import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface MarcaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly foto_relative_path: string | null;
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
        await queryRunner.query(
          `
            INSERT INTO marca (
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
            publicId,
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
          fotoRelativePath: null,
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
        const current: MarcaRecord = await this.requireActiveMarca(
          queryRunner,
          id,
          'La marca que se intenta actualizar no existe.',
        );

        await queryRunner.query(
          `
            UPDATE marca
            SET
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
  ): Promise<MarcaRecord> {
    const rows: readonly MarcaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          m.id,
          m.public_id,
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

    return this.toRecord(row);
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
