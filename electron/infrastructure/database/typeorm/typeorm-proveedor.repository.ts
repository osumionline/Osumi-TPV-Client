import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface ProveedorDatabaseRow {
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

interface ProveedorMarcaDatabaseRow {
  readonly id_proveedor: number;
  readonly id_marca: number;
}

interface ComercialDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_proveedor: number;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly observaciones: string | null;
}

export default class TypeOrmProveedorRepository implements ProveedorRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly ProveedorRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const proveedores: readonly ProveedorDatabaseRow[] = await this.readProveedores(dataSource);

    if (proveedores.length === 0) {
      return [];
    }

    const marcas: readonly ProveedorMarcaDatabaseRow[] = await this.readMarcas(dataSource);

    const comerciales: readonly ComercialDatabaseRow[] = await this.readComerciales(dataSource);

    const marcasByProveedor: ReadonlyMap<number, readonly number[]> = this.groupMarcas(marcas);

    const comercialesByProveedor: ReadonlyMap<number, readonly ComercialRecord[]> =
      this.groupComerciales(comerciales);

    return proveedores.map((proveedor: ProveedorDatabaseRow): ProveedorRecord => ({
      id: proveedor.id,
      publicId: proveedor.public_id,
      nombre: proveedor.nombre,
      fotoRelativePath: proveedor.foto_relative_path,
      direccion: proveedor.direccion,
      telefono: proveedor.telefono,
      email: proveedor.email,
      web: proveedor.web,
      observaciones: proveedor.observaciones,
      marcas: marcasByProveedor.get(proveedor.id) ?? [],
      comerciales: comercialesByProveedor.get(proveedor.id) ?? [],
    }));
  }

  /**
   * Crea un proveedor y relaciona las marcas seleccionadas
   * dentro de una única transacción.
   */
  async create(command: CrearProveedorRecordCommand): Promise<ProveedorRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const publicId: string = randomUUID();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ProveedorRecord> => {
        for (const idMarca of command.idsMarcas) {
          await this.requireActiveMarca(queryRunner, idMarca);
        }

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

        const idProveedor: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del proveedor creado.',
        );

        for (const idMarca of command.idsMarcas) {
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

        return {
          id: idProveedor,
          publicId,
          nombre: command.nombre,
          fotoRelativePath: null,
          direccion: command.direccion,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
          marcas: [...command.idsMarcas],
          comerciales: [],
        };
      },
    );
  }

  /**
   * Comprueba que una marca seleccionada siga activa.
   */
  private async requireActiveMarca(queryRunner: QueryRunner, idMarca: number): Promise<void> {
    const rows: readonly { readonly id: number }[] = (await queryRunner.query(
      `
          SELECT id
          FROM marca
          WHERE
            id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [idMarca],
    )) as readonly { readonly id: number }[];

    if (rows.length === 0) {
      throw new Error('Una de las marcas seleccionadas no existe.');
    }
  }

  private async readProveedores(dataSource: DataSource): Promise<readonly ProveedorDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          p.id,
          p.public_id,
          p.nombre,
          p.direccion,
          p.telefono,
          p.email,
          p.web,
          p.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM proveedor p
        LEFT JOIN archivo a
          ON a.id = p.id_archivo
          AND a.deleted_at IS NULL
        WHERE
          p.deleted_at IS NULL
        ORDER BY
          p.nombre COLLATE NOCASE,
          p.id
      `,
    )) as readonly ProveedorDatabaseRow[];
  }

  private async readMarcas(dataSource: DataSource): Promise<readonly ProveedorMarcaDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          pm.id_proveedor,
          pm.id_marca
        FROM proveedor_marca pm
        INNER JOIN proveedor p
          ON p.id = pm.id_proveedor
          AND p.deleted_at IS NULL
        INNER JOIN marca m
          ON m.id = pm.id_marca
          AND m.deleted_at IS NULL
        ORDER BY
          pm.id_proveedor,
          m.nombre COLLATE NOCASE,
          pm.id_marca
      `,
    )) as readonly ProveedorMarcaDatabaseRow[];
  }

  private async readComerciales(dataSource: DataSource): Promise<readonly ComercialDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_proveedor,
          c.nombre,
          c.telefono,
          c.email,
          c.observaciones
        FROM comercial c
        INNER JOIN proveedor p
          ON p.id = c.id_proveedor
          AND p.deleted_at IS NULL
        WHERE
          c.deleted_at IS NULL
        ORDER BY
          c.id_proveedor,
          c.nombre COLLATE NOCASE,
          c.id
      `,
    )) as readonly ComercialDatabaseRow[];
  }

  private groupMarcas(
    rows: readonly ProveedorMarcaDatabaseRow[],
  ): ReadonlyMap<number, readonly number[]> {
    const result: Map<number, number[]> = new Map<number, number[]>();

    for (const row of rows) {
      const current: number[] = result.get(row.id_proveedor) ?? [];

      current.push(row.id_marca);

      result.set(row.id_proveedor, current);
    }

    return result;
  }

  private groupComerciales(
    rows: readonly ComercialDatabaseRow[],
  ): ReadonlyMap<number, readonly ComercialRecord[]> {
    const result: Map<number, ComercialRecord[]> = new Map<number, ComercialRecord[]>();

    for (const row of rows) {
      const current: ComercialRecord[] = result.get(row.id_proveedor) ?? [];

      current.push({
        id: row.id,
        publicId: row.public_id,
        idProveedor: row.id_proveedor,
        nombre: row.nombre,
        telefono: row.telefono,
        email: row.email,
        observaciones: row.observaciones,
      });

      result.set(row.id_proveedor, current);
    }

    return result;
  }
}
