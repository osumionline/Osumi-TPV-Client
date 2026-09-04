import type ClienteConsumoMensualRepositoryQuery from '@backend/contracts/clientes/cliente-consumo-mensual-query.interface';
import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
import type {
  ClienteConsumoMensualAggregateRecord,
  ClienteConsumoMensualRepositoryResult,
  ClienteSumaVentaRecord,
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

interface ClienteSumaVentaDatabaseRow {
  readonly year: number;
  readonly month: number;
  readonly puc_micros: number;
  readonly pvp_micros: number;
}

interface ClienteConsumoMensualDatabaseRow {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  readonly importe_micros: number;
}

interface ClienteConsumoMensualYearDatabaseRow {
  readonly year: number;
}

interface ClienteUpdateTargetDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly ultima_venta: string | null;
}

interface ChangesDatabaseRow {
  readonly total: number;
}

interface DatabaseIdRow {
  readonly id: number;
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
  async existsActiveByDniCif(dniCif: string, excludedPublicId: string | null): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly { readonly total: number }[] = (await dataSource.query(
      `
      SELECT
        COUNT(*) AS total
      FROM cliente
      WHERE
        dni_cif = ? COLLATE NOCASE
        AND deleted_at IS NULL
        AND (
          ? IS NULL
          OR public_id <> ?
        )
    `,
      [dniCif, excludedPublicId, excludedPublicId],
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
   * Actualiza un cliente activo y devuelve su estado persistido.
   */
  async update(
    publicId: string,
    command: CrearClienteRecordCommand,
  ): Promise<ClienteRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ClienteRecord | null> => {
        const targets: readonly ClienteUpdateTargetDatabaseRow[] = (await queryRunner.query(
          `
          SELECT
            c.id,
            c.public_id,
            MAX(v.created_at) AS ultima_venta
          FROM cliente c
          LEFT JOIN venta v
            ON v.id_cliente = c.id
            AND v.deleted_at IS NULL
          WHERE
            c.public_id = ?
            AND c.deleted_at IS NULL
          GROUP BY
            c.id,
            c.public_id
          LIMIT 1
        `,
          [publicId],
        )) as readonly ClienteUpdateTargetDatabaseRow[];

        const target: ClienteUpdateTargetDatabaseRow | undefined = targets[0];

        if (target === undefined) {
          return null;
        }

        await queryRunner.query(
          `
          UPDATE cliente
          SET
            nombre_apellidos = ?,
            dni_cif = ?,
            telefono = ?,
            email = ?,
            direccion = ?,
            codigo_postal = ?,
            poblacion = ?,
            id_provincia = ?,
            datos_facturacion_iguales = ?,
            fact_nombre_apellidos = ?,
            fact_dni_cif = ?,
            fact_telefono = ?,
            fact_email = ?,
            fact_direccion = ?,
            fact_codigo_postal = ?,
            fact_poblacion = ?,
            fact_id_provincia = ?,
            observaciones = ?,
            descuento_bps = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
          [
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
            target.id,
          ],
        );

        return {
          id: target.id,
          publicId: target.public_id,
          ...command,
          ultimaVenta: target.ultima_venta,
        };
      },
    );
  }

  /**
   * Da de baja lógicamente un cliente activo, siempre que no
   * conserve ninguna factura activa en estado borrador.
   */
  async deactivate(publicId: string): Promise<ClienteDeactivateResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ClienteDeactivateResult> => {
        await queryRunner.query(
          `
          UPDATE cliente
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            public_id = ?
            AND deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM factura f
              WHERE
                f.id_cliente = cliente.id
                AND f.estado = 'borrador'
                AND f.deleted_at IS NULL
            )
        `,
          [timestamp, timestamp, publicId],
        );

        const changesRows: readonly ChangesDatabaseRow[] = (await queryRunner.query(
          `
          SELECT changes() AS total
        `,
        )) as readonly ChangesDatabaseRow[];

        const changes: number | undefined = changesRows[0]?.total;

        if (changes === 1) {
          return 'deactivated';
        }

        if (changes !== 0) {
          throw new Error('No se ha podido determinar el resultado de la baja del cliente.');
        }

        const activeRows: readonly DatabaseIdRow[] = (await queryRunner.query(
          `
          SELECT id
          FROM cliente
          WHERE
            public_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
          [publicId],
        )) as readonly DatabaseIdRow[];

        return activeRows.length === 0 ? 'not_found' : 'has_draft_invoices';
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
          importe_micros DESC,
          unidades DESC,
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

  /**
   * Agrega por año y mes el coste y el importe real
   * de las ventas asociadas a un cliente.
   *
   * Las unidades negativas hacen que las devoluciones
   * resten también del coste histórico.
   */
  async findSumaVentas(publicId: string): Promise<readonly ClienteSumaVentaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteSumaVentaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          CAST(
            strftime('%Y', v.created_at)
            AS INTEGER
          ) AS year,
          CAST(
            strftime('%m', v.created_at)
            AS INTEGER
          ) AS month,
          CAST(
            SUM(lv.puc_micros * lv.unidades)
            AS INTEGER
          ) AS puc_micros,
          CAST(
            SUM(lv.importe_micros)
            AS INTEGER
          ) AS pvp_micros
        FROM cliente c

        INNER JOIN venta v
          ON v.id_cliente = c.id

        INNER JOIN linea_venta lv
          ON lv.id_venta = v.id

        WHERE
          c.public_id = ?
          AND c.deleted_at IS NULL
          AND v.deleted_at IS NULL

        GROUP BY
          year,
          month

        ORDER BY
          year,
          month
      `,
      [publicId],
    )) as readonly ClienteSumaVentaDatabaseRow[];

    return rows.map((row: ClienteSumaVentaDatabaseRow): ClienteSumaVentaRecord => {
      if (
        !Number.isSafeInteger(row.year) ||
        row.year < 1 ||
        !Number.isSafeInteger(row.month) ||
        row.month < 1 ||
        row.month > 12
      ) {
        throw new Error('Las fechas agregadas de las ventas del cliente no son válidas.');
      }

      if (!Number.isSafeInteger(row.puc_micros) || !Number.isSafeInteger(row.pvp_micros)) {
        throw new Error('Las sumas de ventas del cliente superan el rango numérico seguro.');
      }

      return {
        year: row.year,
        month: row.month,
        pucMicros: row.puc_micros,
        pvpMicros: row.pvp_micros,
      };
    });
  }

  /**
   * Agrega el importe real consumido por un cliente
   * según los filtros temporales solicitados.
   */
  async findConsumoMensual(
    query: ClienteConsumoMensualRepositoryQuery,
  ): Promise<ClienteConsumoMensualRepositoryResult> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const yearExpression: string = "CAST(strftime('%Y', v.created_at) AS INTEGER)";
    const monthExpression: string = "CAST(strftime('%m', v.created_at) AS INTEGER)";
    const daily: boolean = query.year !== null && query.month !== null;
    const dayExpression: string = daily ? "CAST(strftime('%d', v.created_at) AS INTEGER)" : 'NULL';

    const conditions: string[] = [
      'c.public_id = ?',
      'c.deleted_at IS NULL',
      'v.deleted_at IS NULL',
    ];

    const parameters: (string | number)[] = [query.publicId];

    if (query.year !== null) {
      conditions.push(`${yearExpression} = ?`);
      parameters.push(query.year);
    }

    if (query.month !== null) {
      conditions.push(`${monthExpression} = ?`);
      parameters.push(query.month);
    }

    const groupByExpression: string = daily
      ? `${yearExpression}, ${monthExpression}, ${dayExpression}`
      : `${yearExpression}, ${monthExpression}`;

    const rows: readonly ClienteConsumoMensualDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ${yearExpression} AS year,
          ${monthExpression} AS month,
          ${dayExpression} AS day,
          CAST(
            SUM(lv.importe_micros)
            AS INTEGER
          ) AS importe_micros
        FROM cliente c

        INNER JOIN venta v
          ON v.id_cliente = c.id

        INNER JOIN linea_venta lv
          ON lv.id_venta = v.id

        WHERE
          ${conditions.join('\n          AND ')}

        GROUP BY
          ${groupByExpression}

        ORDER BY
          ${groupByExpression}
      `,
      parameters,
    )) as readonly ClienteConsumoMensualDatabaseRow[];

    const yearRows: readonly ClienteConsumoMensualYearDatabaseRow[] = (await dataSource.query(
      `
          SELECT DISTINCT
            ${yearExpression} AS year
          FROM cliente c

          INNER JOIN venta v
            ON v.id_cliente = c.id

          INNER JOIN linea_venta lv
            ON lv.id_venta = v.id

          WHERE
            c.public_id = ?
            AND c.deleted_at IS NULL
            AND v.deleted_at IS NULL

          ORDER BY
            year
        `,
      [query.publicId],
    )) as readonly ClienteConsumoMensualYearDatabaseRow[];

    const years: readonly number[] = yearRows.map(
      (row: ClienteConsumoMensualYearDatabaseRow): number => {
        if (!Number.isSafeInteger(row.year) || row.year < 1 || row.year > 9999) {
          throw new Error('Los años disponibles del consumo del cliente no son válidos.');
        }

        return row.year;
      },
    );

    const items: readonly ClienteConsumoMensualAggregateRecord[] = rows.map(
      (row: ClienteConsumoMensualDatabaseRow): ClienteConsumoMensualAggregateRecord => {
        const validDay: boolean =
          row.day === null || (Number.isSafeInteger(row.day) && row.day >= 1 && row.day <= 31);

        if (
          !Number.isSafeInteger(row.year) ||
          row.year < 1 ||
          row.year > 9999 ||
          !Number.isSafeInteger(row.month) ||
          row.month < 1 ||
          row.month > 12 ||
          !validDay ||
          (daily && row.day === null) ||
          (!daily && row.day !== null) ||
          !Number.isSafeInteger(row.importe_micros)
        ) {
          throw new Error('Los agregados de consumo mensual del cliente no son válidos.');
        }

        return {
          year: row.year,
          month: row.month,
          day: row.day,
          importeMicros: row.importe_micros,
        };
      },
    );

    return {
      years,
      items,
    };
  }
}
