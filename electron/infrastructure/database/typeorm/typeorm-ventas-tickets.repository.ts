import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type {
  VentaTicketLineaRecord,
  VentaTicketPagoRecord,
  VentaTicketRecord,
} from '@backend/domain/ventas/venta-ticket-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface VentaTicketDatabaseRow {
  readonly id: number;
  readonly public_id: string;

  readonly serie: string;
  readonly numero: number;

  readonly fecha: string;

  readonly empleado_nombre: string;
  readonly cliente_nombre: string | null;

  readonly total_cents: number;
}

interface VentaTicketPagoDatabaseRow {
  readonly nombre: string;

  readonly importe_cents: number;
  readonly entregado_cents: number | null;
  readonly cambio_cents: number;
}

interface VentaTicketLineaDatabaseRow {
  readonly nombre: string;

  readonly pvp_micros: number;
  readonly iva_bps: number;

  readonly importe_micros: number;

  readonly descuento_bps: number;
  readonly importe_descuento_micros: number;

  readonly unidades: number;
  readonly regalo: number;
}

export default class TypeOrmVentasTicketsRepository implements VentasTicketsRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findByVentaId(idVenta: number): Promise<VentaTicketRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const ventaRows: readonly VentaTicketDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            v.id,
            v.public_id,
            v.serie,
            v.numero,
            v.created_at AS fecha,
            e.nombre AS empleado_nombre,
            c.nombre_apellidos AS cliente_nombre,
            v.total_cents
          FROM venta v

          INNER JOIN empleado e
            ON e.id = v.id_empleado

          LEFT JOIN cliente c
            ON c.id = v.id_cliente

          WHERE
            v.id = ?
            AND v.deleted_at IS NULL

          LIMIT 1
        `,
      [idVenta],
    )) as readonly VentaTicketDatabaseRow[];

    const venta: VentaTicketDatabaseRow | undefined = ventaRows[0];

    if (venta === undefined) {
      return null;
    }

    const pagos: readonly VentaTicketPagoRecord[] = await this.findPagos(dataSource, idVenta);

    const lineas: readonly VentaTicketLineaRecord[] = await this.findLineas(dataSource, idVenta);

    return {
      id: venta.id,
      publicId: venta.public_id,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      empleadoNombre: venta.empleado_nombre,
      clienteNombre: venta.cliente_nombre,
      totalCents: venta.total_cents,
      pagos,
      lineas,
    };
  }

  private async findPagos(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaTicketPagoRecord[]> {
    const rows: readonly VentaTicketPagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            tp.nombre,
            vp.importe_cents,
            vp.entregado_cents,
            vp.cambio_cents
          FROM venta_pago vp

          INNER JOIN tipo_pago tp
            ON tp.id = vp.id_tipo_pago

          WHERE vp.id_venta = ?

          ORDER BY
            vp.orden,
            vp.id
        `,
      [idVenta],
    )) as readonly VentaTicketPagoDatabaseRow[];

    return rows.map((row: VentaTicketPagoDatabaseRow): VentaTicketPagoRecord => ({
      nombre: row.nombre,
      importeCents: row.importe_cents,
      entregadoCents: row.entregado_cents,
      cambioCents: row.cambio_cents,
    }));
  }

  private async findLineas(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaTicketLineaRecord[]> {
    const rows: readonly VentaTicketLineaDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            lv.nombre_articulo AS nombre,
            lv.pvp_micros,
            lv.iva_bps,
            lv.importe_micros,
            lv.descuento_bps,
            lv.importe_descuento_micros,
            lv.unidades,
            lv.regalo
          FROM linea_venta lv
          WHERE lv.id_venta = ?
          ORDER BY lv.id
        `,
      [idVenta],
    )) as readonly VentaTicketLineaDatabaseRow[];

    return rows.map((row: VentaTicketLineaDatabaseRow): VentaTicketLineaRecord => ({
      nombre: row.nombre,
      pvpMicros: row.pvp_micros,
      ivaBps: row.iva_bps,
      importeMicros: row.importe_micros,
      descuentoBps: row.descuento_bps,
      importeDescuentoMicros: row.importe_descuento_micros,
      unidades: row.unidades,
      regalo: row.regalo === 1,
    }));
  }
}
