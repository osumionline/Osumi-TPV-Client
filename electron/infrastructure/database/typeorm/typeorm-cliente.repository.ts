import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

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

interface ClienteUltimaVentaDatabaseRow {
  readonly fecha: string;
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly pvp_micros: number;
  readonly importe_micros: number;
}

interface ClienteTopVentaDatabaseRow {
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly importe_micros: number;
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

  /**
   * Comprueba si existe un cliente activo con el DNI/CIF indicado.
   */
  async existsActiveByDniCif(dniCif: string): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly { readonly total: number }[] = (await dataSource.query(
      `
        SELECT
          COUNT(*) AS total
        FROM cliente
        WHERE
          dni_cif = ? COLLATE NOCASE
          AND deleted_at IS NULL
      `,
      [dniCif],
    )) as readonly { readonly total: number }[];

    return (rows[0]?.total ?? 0) > 0;
  }

  /**
   * Persiste un nuevo cliente.
   */
  async create(command: CrearClienteRecordCommand): Promise<ClienteRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const publicId: string = randomUUID();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ClienteRecord> => {
        await queryRunner.query(
          `
          INSERT INTO cliente (
            public_id,
            nombre_apellidos,
            dni_cif,
            telefono,
            email,
            direccion,
            codigo_postal,
            poblacion,
            id_provincia,
            datos_facturacion_iguales,
            fact_nombre_apellidos,
            fact_dni_cif,
            fact_telefono,
            fact_email,
            fact_direccion,
            fact_codigo_postal,
            fact_poblacion,
            fact_id_provincia,
            observaciones,
            descuento_bps,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `,
          [
            publicId,
            command.nombreApellidos,
            command.dniCif,
            command.telefono,
            command.email,
            command.direccion,
            command.codigoPostal,
            command.poblacion,
            command.provincia,
            command.factIgual ? 1 : 0,
            command.factNombreApellidos,
            command.factDniCif,
            command.factTelefono,
            command.factEmail,
            command.factDireccion,
            command.factCodigoPostal,
            command.factPoblacion,
            command.factProvincia,
            command.observaciones,
            command.descuentoBps,
            timestamp,
            timestamp,
          ],
        );

        const id: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del cliente creado.',
        );

        return {
          id,
          publicId,
          nombreApellidos: command.nombreApellidos,
          dniCif: command.dniCif,
          telefono: command.telefono,
          email: command.email,
          direccion: command.direccion,
          codigoPostal: command.codigoPostal,
          poblacion: command.poblacion,
          provincia: command.provincia,
          factIgual: command.factIgual,
          factNombreApellidos: command.factNombreApellidos,
          factDniCif: command.factDniCif,
          factTelefono: command.factTelefono,
          factEmail: command.factEmail,
          factDireccion: command.factDireccion,
          factCodigoPostal: command.factCodigoPostal,
          factPoblacion: command.factPoblacion,
          factProvincia: command.factProvincia,
          observaciones: command.observaciones,
          descuentoBps: command.descuentoBps,
          ultimaVenta: null,
        };
      },
    );
  }

  /**
   * Recupera las últimas líneas compradas por un cliente.
   */
  async findUltimasVentas(
    publicId: string,
    limit: number,
  ): Promise<readonly ClienteUltimaVentaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteUltimaVentaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          lv.created_at AS fecha,
          a.localizador,
          lv.nombre_articulo AS nombre,
          lv.unidades,
          lv.pvp_micros,
          lv.importe_micros
        FROM cliente c
        INNER JOIN venta v
          ON v.id_cliente = c.id
        INNER JOIN linea_venta lv
          ON lv.id_venta = v.id
        LEFT JOIN articulo a
          ON a.id = lv.id_articulo
        WHERE
          c.public_id = ?
          AND c.deleted_at IS NULL
          AND v.deleted_at IS NULL
        ORDER BY
          v.created_at DESC,
          lv.id DESC
        LIMIT ?
      `,
      [publicId, limit],
    )) as readonly ClienteUltimaVentaDatabaseRow[];

    return rows.map((row: ClienteUltimaVentaDatabaseRow): ClienteUltimaVentaRecord => ({
      fecha: row.fecha,
      localizador: row.localizador,
      nombre: row.nombre,
      unidades: row.unidades,
      pvpMicros: row.pvp_micros,
      importeMicros: row.importe_micros,
    }));
  }

  /**
   * Recupera los artículos más comprados por un cliente,
   * agregando unidades e importe directamente en SQLite.
   */
  async findTopVentas(publicId: string, limit: number): Promise<readonly ClienteTopVentaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteTopVentaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          a.localizador,
          COALESCE(
            a.nombre,
            lv.nombre_articulo
          ) AS nombre,
          CAST(
            SUM(lv.unidades)
            AS INTEGER
          ) AS unidades,
          CAST(
            SUM(lv.importe_micros)
            AS INTEGER
          ) AS importe_micros
        FROM cliente c
        INNER JOIN venta v
          ON v.id_cliente = c.id
        INNER JOIN linea_venta lv
          ON lv.id_venta = v.id
        LEFT JOIN articulo a
          ON a.id = lv.id_articulo
        WHERE
          c.public_id = ?
          AND c.deleted_at IS NULL
          AND v.deleted_at IS NULL
        GROUP BY
          lv.id_articulo,
          a.localizador,
          a.nombre,
          CASE
            WHEN lv.id_articulo IS NULL
              THEN lv.nombre_articulo
            ELSE NULL
          END
        ORDER BY
          unidades DESC,
          importe_micros DESC,
          nombre COLLATE NOCASE
        LIMIT ?
      `,
      [publicId, limit],
    )) as readonly ClienteTopVentaDatabaseRow[];

    return rows.map((row: ClienteTopVentaDatabaseRow): ClienteTopVentaRecord => ({
      localizador: row.localizador,
      nombre: row.nombre,
      unidades: row.unidades,
      importeMicros: row.importe_micros,
    }));
  }
}
