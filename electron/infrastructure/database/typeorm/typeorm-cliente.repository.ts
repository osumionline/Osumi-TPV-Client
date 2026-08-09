import type ClienteRepository from '@backend/contracts/cliente.repository.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface ClienteDatabaseRow {
  readonly id: number;

  readonly public_id: string;

  readonly nombre_apellidos: string;

  readonly dni_cif: string | null;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly direccion: string | null;

  readonly codigo_postal: string | null;

  readonly poblacion: string | null;

  readonly id_provincia: number | null;

  readonly datos_facturacion_iguales: number;

  readonly fact_nombre_apellidos: string | null;

  readonly fact_dni_cif: string | null;

  readonly fact_telefono: string | null;

  readonly fact_email: string | null;

  readonly fact_direccion: string | null;

  readonly fact_codigo_postal: string | null;

  readonly fact_poblacion: string | null;

  readonly fact_id_provincia: number | null;

  readonly observaciones: string | null;

  readonly descuento_bps: number;

  readonly ultima_venta: string | null;
}

export default class TypeOrmClienteRepository implements ClienteRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly ClienteRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.nombre_apellidos,
          c.dni_cif,
          c.telefono,
          c.email,
          c.direccion,
          c.codigo_postal,
          c.poblacion,
          c.id_provincia,
          c.datos_facturacion_iguales,
          c.fact_nombre_apellidos,
          c.fact_dni_cif,
          c.fact_telefono,
          c.fact_email,
          c.fact_direccion,
          c.fact_codigo_postal,
          c.fact_poblacion,
          c.fact_id_provincia,
          c.observaciones,
          c.descuento_bps,
          uv.ultima_venta
        FROM cliente c
        LEFT JOIN (
          SELECT
            v.id_cliente,
            MAX(v.created_at) AS ultima_venta
          FROM venta v
          WHERE
            v.id_cliente IS NOT NULL
            AND v.deleted_at IS NULL
          GROUP BY
            v.id_cliente
        ) uv
          ON uv.id_cliente = c.id
        WHERE
          c.deleted_at IS NULL
        ORDER BY
          c.nombre_apellidos COLLATE NOCASE,
          c.id
      `,
    )) as readonly ClienteDatabaseRow[];

    return rows.map((row: ClienteDatabaseRow): ClienteRecord => ({
      id: row.id,
      publicId: row.public_id,
      nombreApellidos: row.nombre_apellidos,
      dniCif: row.dni_cif,
      telefono: row.telefono,
      email: row.email,
      direccion: row.direccion,
      codigoPostal: row.codigo_postal,
      poblacion: row.poblacion,
      provincia: row.id_provincia,
      factIgual: row.datos_facturacion_iguales === 1,
      factNombreApellidos: row.fact_nombre_apellidos,
      factDniCif: row.fact_dni_cif,
      factTelefono: row.fact_telefono,
      factEmail: row.fact_email,
      factDireccion: row.fact_direccion,
      factCodigoPostal: row.fact_codigo_postal,
      factPoblacion: row.fact_poblacion,
      factProvincia: row.fact_id_provincia,
      observaciones: row.observaciones,
      descuentoBps: row.descuento_bps,
      ultimaVenta: row.ultima_venta,
    }));
  }
}
