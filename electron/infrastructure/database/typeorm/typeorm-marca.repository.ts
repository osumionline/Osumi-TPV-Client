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

    return rows.map((row: MarcaDatabaseRow): MarcaRecord => ({
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      direccion: row.direccion,
      fotoRelativePath: row.foto_relative_path,
      telefono: row.telefono,
      email: row.email,
      web: row.web,
      observaciones: row.observaciones,
    }));
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
