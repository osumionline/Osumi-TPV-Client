import type ProveedorRepository from '@backend/contracts/proveedor.repository.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

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
