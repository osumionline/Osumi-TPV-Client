import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type CrearClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/crear-cliente-factura-borrador-record-command.interface';
import type {
  ClienteFacturaEstadoRecord,
  ClienteFacturaRecord,
} from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaVentaDisponibleRecord,
  ClienteFacturaVentaPagoRecord,
} from '@backend/domain/clientes/cliente-factura-venta-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface ClienteFacturaDatabaseRow {
  readonly public_id: string;
  readonly serie: string;
  readonly numero: number | null;
  readonly year: number | null;
  readonly estado: ClienteFacturaEstadoRecord;
  readonly importe_cents: number;
  readonly fecha_creacion: string;
  readonly fecha_emision: string | null;
  readonly fecha_anulacion: string | null;
}

interface ClienteFacturaVentaDisponibleDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly total_cents: number;
  readonly incluida_en_borrador: number;
  readonly tipo_pago_public_id: string | null;
  readonly tipo_pago_nombre: string | null;
  readonly pago_importe_cents: number | null;
}

interface ClienteFacturaVentaAccumulator {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly incluidaEnBorrador: boolean;
  readonly pagos: ClienteFacturaVentaPagoRecord[];
}

interface ClienteFacturaClienteDatabaseRow {
  readonly id: number;
  readonly nombre_apellidos: string;
  readonly dni_cif: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly codigo_postal: string | null;
  readonly poblacion: string | null;
  readonly id_provincia: number | null;
}

interface ClienteFacturaVentaSeleccionadaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly total_cents: number;
}

export default class TypeOrmClienteFacturasRepository implements ClienteFacturasRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera las facturas no eliminadas pertenecientes
   * al cliente activo indicado.
   */
  async findByClientePublicId(publicId: string): Promise<readonly ClienteFacturaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteFacturaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          f.public_id,
          f.serie,
          f.numero,
          CASE
            WHEN f.numero IS NULL THEN NULL
            ELSE CAST(
              strftime(
                '%Y',
                f.fecha_emision
              )
              AS INTEGER
            )
          END AS year,
          f.estado,
          f.importe_cents,
          f.created_at AS fecha_creacion,
          f.fecha_emision,
          f.fecha_anulacion
        FROM cliente c

        INNER JOIN factura f
          ON f.id_cliente = c.id

        WHERE
          c.public_id = ?
          AND c.deleted_at IS NULL
          AND f.deleted_at IS NULL

        ORDER BY
          datetime(
            CASE
              WHEN f.estado = 'borrador' THEN f.created_at
              ELSE f.fecha_emision
            END
          ) DESC,
          f.id DESC
      `,
      [publicId],
    )) as readonly ClienteFacturaDatabaseRow[];

    return rows.map((row: ClienteFacturaDatabaseRow): ClienteFacturaRecord => ({
      publicId: row.public_id,
      serie: row.serie,
      numero: row.numero,
      year: row.year,
      estado: row.estado,
      importeCents: row.importe_cents,
      fechaCreacion: row.fecha_creacion,
      fechaEmision: row.fecha_emision,
      fechaAnulacion: row.fecha_anulacion,
    }));
  }

  /**
   * Crea un borrador utilizando exclusivamente datos
   * canónicos y ventas revalidadas dentro de la transacción.
   */
  async createBorrador(
    command: CrearClienteFacturaBorradorRecordCommand,
  ): Promise<ClienteFacturaRecord> {
    const ventasPublicIds: readonly string[] = this.normalizeVentaPublicIds(
      command.ventasPublicIds,
    );
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const publicId: string = randomUUID();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ClienteFacturaRecord> => {
        const cliente: ClienteFacturaClienteDatabaseRow = await this.resolveClienteFacturacion(
          queryRunner,
          command.clientePublicId,
        );

        const ventas: readonly ClienteFacturaVentaSeleccionadaDatabaseRow[] =
          await this.resolveVentasSeleccionadas(queryRunner, cliente.id, ventasPublicIds);

        const importeCents: number = this.sumImporteVentas(ventas);

        await this.insertBorrador(queryRunner, publicId, cliente, importeCents, timestamp);

        const facturaId: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del borrador creado.',
        );

        await this.insertRelacionesBorrador(queryRunner, facturaId, ventas, timestamp);

        return {
          publicId,
          serie: '',
          numero: null,
          year: null,
          estado: 'borrador',
          importeCents,
          fechaCreacion: timestamp,
          fechaEmision: null,
          fechaAnulacion: null,
        };
      },
    );
  }

  /**
   * Recupera las ventas positivas y no bloqueadas que pueden
   * incorporarse a una factura del cliente.
   */
  async findVentasDisponibles(
    clientePublicId: string,
    borradorPublicId: string | null,
  ): Promise<readonly ClienteFacturaVentaDisponibleRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ClienteFacturaVentaDisponibleDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            v.id,
            v.public_id,
            v.serie,
            v.numero,
            v.created_at AS fecha,
            v.total_cents,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM factura_venta fv_propia

                INNER JOIN factura f_propia
                  ON f_propia.id = fv_propia.id_factura

                WHERE
                  fv_propia.id_venta = v.id
                  AND fv_propia.activa = 1
                  AND f_propia.public_id = ?
                  AND f_propia.id_cliente = v.id_cliente
                  AND f_propia.estado = 'borrador'
                  AND f_propia.deleted_at IS NULL
              ) THEN 1
              ELSE 0
            END AS incluida_en_borrador,
            tp.public_id AS tipo_pago_public_id,
            tp.nombre AS tipo_pago_nombre,
            vp.importe_cents AS pago_importe_cents
          FROM venta v

          INNER JOIN cliente c
            ON c.id = v.id_cliente

          LEFT JOIN venta_pago vp
            ON vp.id_venta = v.id

          LEFT JOIN tipo_pago tp
            ON tp.id = vp.id_tipo_pago

          WHERE
            c.public_id = ?
            AND c.deleted_at IS NULL
            AND v.deleted_at IS NULL
            AND v.total_cents > 0
            AND v.id_venta_origen_devolucion IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM linea_venta lv
              WHERE
                lv.id_venta = v.id
                AND (
                  lv.unidades < 0
                  OR lv.id_linea_venta_origen_devolucion IS NOT NULL
                )
            )
            AND NOT EXISTS (
              SELECT 1
              FROM factura_venta fv_bloqueo

              INNER JOIN factura f_bloqueo
                ON f_bloqueo.id = fv_bloqueo.id_factura

              WHERE
                fv_bloqueo.id_venta = v.id
                AND fv_bloqueo.activa = 1
                AND NOT (
                  ? IS NOT NULL
                  AND f_bloqueo.public_id = ?
                  AND f_bloqueo.id_cliente = v.id_cliente
                  AND f_bloqueo.estado = 'borrador'
                  AND f_bloqueo.deleted_at IS NULL
                )
            )

          ORDER BY
            v.created_at DESC,
            v.id DESC,
            vp.orden ASC,
            vp.id ASC
        `,
      [borradorPublicId, clientePublicId, borradorPublicId, borradorPublicId],
    )) as readonly ClienteFacturaVentaDisponibleDatabaseRow[];

    const ventas: Map<number, ClienteFacturaVentaAccumulator> = new Map<
      number,
      ClienteFacturaVentaAccumulator
    >();

    for (const row of rows) {
      let venta: ClienteFacturaVentaAccumulator | undefined = ventas.get(row.id);

      if (venta === undefined) {
        venta = {
          id: row.id,
          publicId: row.public_id,
          serie: row.serie,
          numero: row.numero,
          fecha: row.fecha,
          totalCents: row.total_cents,
          incluidaEnBorrador: row.incluida_en_borrador === 1,
          pagos: [],
        };

        ventas.set(row.id, venta);
      }

      if (
        row.tipo_pago_public_id !== null &&
        row.tipo_pago_nombre !== null &&
        row.pago_importe_cents !== null
      ) {
        venta.pagos.push({
          tipoPagoPublicId: row.tipo_pago_public_id,
          nombre: row.tipo_pago_nombre,
          importeCents: row.pago_importe_cents,
        });
      }
    }

    return Array.from(ventas.values());
  }

  /**
   * Normaliza los identificadores seleccionados y rechaza
   * listas vacías, valores inválidos o duplicados.
   */
  private normalizeVentaPublicIds(values: readonly string[]): readonly string[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('La factura debe incluir al menos una venta.');
    }

    const normalizedValues: readonly string[] = values.map((value: string): string => {
      if (typeof value !== 'string') {
        throw new Error('Una de las ventas seleccionadas no tiene un identificador válido.');
      }

      const normalizedValue: string = value.trim();

      if (normalizedValue.length === 0) {
        throw new Error('Una de las ventas seleccionadas no tiene un identificador válido.');
      }

      return normalizedValue;
    });

    if (new Set<string>(normalizedValues).size !== normalizedValues.length) {
      throw new Error('Una venta no se puede incluir más de una vez en la misma factura.');
    }

    return normalizedValues;
  }

  /**
   * Recupera el cliente activo y construye los datos de
   * facturación efectivos que se copiarán al borrador.
   */
  private async resolveClienteFacturacion(
    queryRunner: QueryRunner,
    publicId: string,
  ): Promise<ClienteFacturaClienteDatabaseRow> {
    const rows: readonly ClienteFacturaClienteDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.id,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.nombre_apellidos
            ELSE COALESCE(
              c.fact_nombre_apellidos,
              c.nombre_apellidos
            )
          END AS nombre_apellidos,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.dni_cif
            ELSE c.fact_dni_cif
          END AS dni_cif,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.telefono
            ELSE c.fact_telefono
          END AS telefono,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.email
            ELSE c.fact_email
          END AS email,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.direccion
            ELSE c.fact_direccion
          END AS direccion,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.codigo_postal
            ELSE c.fact_codigo_postal
          END AS codigo_postal,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.poblacion
            ELSE c.fact_poblacion
          END AS poblacion,
          CASE
            WHEN c.datos_facturacion_iguales = 1
              THEN c.id_provincia
            ELSE c.fact_id_provincia
          END AS id_provincia
        FROM cliente c
        WHERE
          c.public_id = ?
          AND c.deleted_at IS NULL
        LIMIT 1
      `,
      [publicId],
    )) as readonly ClienteFacturaClienteDatabaseRow[];

    const cliente: ClienteFacturaClienteDatabaseRow | undefined = rows[0];

    if (cliente === undefined) {
      throw new Error('El cliente indicado no existe o ya no está activo.');
    }

    return cliente;
  }

  /**
   * Revalida las ventas seleccionadas dentro de la transacción.
   */
  private async resolveVentasSeleccionadas(
    queryRunner: QueryRunner,
    clienteId: number,
    publicIds: readonly string[],
  ): Promise<readonly ClienteFacturaVentaSeleccionadaDatabaseRow[]> {
    const placeholders: string = publicIds.map((): string => '?').join(', ');

    const rows: readonly ClienteFacturaVentaSeleccionadaDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            v.id,
            v.public_id,
            v.total_cents
          FROM venta v
          WHERE
            v.public_id IN (${placeholders})
            AND v.id_cliente = ?
            AND v.deleted_at IS NULL
            AND v.total_cents > 0
            AND v.id_venta_origen_devolucion IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM linea_venta lv
              WHERE
                lv.id_venta = v.id
                AND (
                  lv.unidades < 0
                  OR lv.id_linea_venta_origen_devolucion IS NOT NULL
                )
            )
            AND NOT EXISTS (
              SELECT 1
              FROM factura_venta fv
              WHERE
                fv.id_venta = v.id
                AND fv.activa = 1
            )
        `,
      [...publicIds, clienteId],
    )) as readonly ClienteFacturaVentaSeleccionadaDatabaseRow[];

    if (rows.length !== publicIds.length) {
      throw new Error('Alguna de las ventas seleccionadas ya no está disponible para facturar.');
    }

    return rows;
  }

  /**
   * Suma los importes canónicos de las ventas comprobando
   * que el resultado siga siendo un entero seguro.
   */
  private sumImporteVentas(ventas: readonly ClienteFacturaVentaSeleccionadaDatabaseRow[]): number {
    let importeCents: bigint = 0n;

    for (const venta of ventas) {
      if (!Number.isSafeInteger(venta.total_cents) || venta.total_cents <= 0) {
        throw new Error('El importe de una de las ventas seleccionadas no es válido.');
      }

      importeCents += BigInt(venta.total_cents);
    }

    const result: number = Number(importeCents);

    if (!Number.isSafeInteger(result)) {
      throw new Error('El importe de la factura supera el rango numérico seguro.');
    }

    return result;
  }

  /**
   * Inserta el borrador con una instantánea de los
   * datos de facturación actuales del cliente.
   */
  private async insertBorrador(
    queryRunner: QueryRunner,
    publicId: string,
    cliente: ClienteFacturaClienteDatabaseRow,
    importeCents: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO factura (
          public_id,
          id_cliente,
          serie,
          numero,
          estado,
          nombre_apellidos,
          dni_cif,
          telefono,
          email,
          direccion,
          codigo_postal,
          poblacion,
          id_provincia,
          importe_cents,
          impresa,
          fecha_emision,
          fecha_anulacion,
          created_at,
          updated_at
        )
        VALUES (
          ?,
          ?,
          '',
          NULL,
          'borrador',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          0,
          NULL,
          NULL,
          ?,
          ?
        )
      `,
      [
        publicId,
        cliente.id,
        cliente.nombre_apellidos,
        cliente.dni_cif,
        cliente.telefono,
        cliente.email,
        cliente.direccion,
        cliente.codigo_postal,
        cliente.poblacion,
        cliente.id_provincia,
        importeCents,
        timestamp,
        timestamp,
      ],
    );
  }

  /**
   * Crea las relaciones activas entre el borrador
   * y todas sus ventas seleccionadas.
   */
  private async insertRelacionesBorrador(
    queryRunner: QueryRunner,
    facturaId: number,
    ventas: readonly ClienteFacturaVentaSeleccionadaDatabaseRow[],
    timestamp: string,
  ): Promise<void> {
    for (const venta of ventas) {
      await queryRunner.query(
        `
          INSERT INTO factura_venta (
            id_factura,
            id_venta,
            activa,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            1,
            ?,
            ?
          )
        `,
        [facturaId, venta.id, timestamp, timestamp],
      );
    }
  }
}
