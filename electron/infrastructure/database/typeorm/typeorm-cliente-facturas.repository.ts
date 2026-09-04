import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type {
  ClienteFacturaEstadoRecord,
  ClienteFacturaRecord,
} from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaVentaDisponibleRecord,
  ClienteFacturaVentaPagoRecord,
} from '@backend/domain/clientes/cliente-factura-venta-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

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
}
