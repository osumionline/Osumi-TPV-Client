import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type {
  VentaTicketBaiDocumentRecord,
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
  readonly ticket_revision: number;
  readonly ticket_pdf_revision: number;

  readonly ticketbai_estado: string | null;
  readonly ticketbai_serie: string | null;
  readonly ticketbai_numero: string | null;
  readonly ticketbai_huella: string | null;
  readonly ticketbai_qr: string | null;
  readonly ticketbai_url: string | null;
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
            v.total_cents,
            v.ticket_revision,
            v.ticket_pdf_revision,
            vtb.estado AS ticketbai_estado,
            vtb.serie AS ticketbai_serie,
            vtb.numero AS ticketbai_numero,
            vtb.huella AS ticketbai_huella,
            vtb.qr AS ticketbai_qr,
            vtb.url AS ticketbai_url
          FROM venta v

          INNER JOIN empleado e
            ON e.id = v.id_empleado

          LEFT JOIN cliente c
            ON c.id = v.id_cliente

          LEFT JOIN venta_ticketbai vtb
            ON vtb.id_venta = v.id

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

    const ticketBai: VentaTicketBaiDocumentRecord | null = this.mapTicketBai(venta);

    return {
      id: venta.id,
      publicId: venta.public_id,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      empleadoNombre: venta.empleado_nombre,
      clienteNombre: venta.cliente_nombre,
      ticketBai,
      totalCents: venta.total_cents,
      pagos,
      lineas,
      ticketRevision: venta.ticket_revision,
      ticketPdfRevision: venta.ticket_pdf_revision,
    };
  }

  /**
   * Confirma que un PDF representa la revisión esperada.
   *
   * Si otra operación incrementó ticket_revision durante
   * la generación, la revisión no se marca como vigente.
   */
  async markPdfRevision(idVenta: number, expectedRevision: number): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await dataSource.query(
      `
        UPDATE venta
        SET ticket_pdf_revision = ?
        WHERE
          id = ?
          AND deleted_at IS NULL
          AND ticket_revision = ?
          AND ticket_pdf_revision <= ?
      `,
      [expectedRevision, idVenta, expectedRevision, expectedRevision],
    );

    const rows: readonly {
      readonly ticket_revision: number;
      readonly ticket_pdf_revision: number;
    }[] = (await dataSource.query(
      `
        SELECT
          ticket_revision,
          ticket_pdf_revision
        FROM venta
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [idVenta],
    )) as readonly {
      readonly ticket_revision: number;
      readonly ticket_pdf_revision: number;
    }[];

    const row = rows[0];

    return (
      row !== undefined &&
      row.ticket_revision === expectedRevision &&
      row.ticket_pdf_revision === expectedRevision
    );
  }

  /**
   * Expone únicamente los datos TicketBAI que ya pueden
   * formar parte de un documento definitivo.
   */
  private mapTicketBai(row: VentaTicketDatabaseRow): VentaTicketBaiDocumentRecord | null {
    if (row.ticketbai_estado !== 'aceptada' && row.ticketbai_estado !== 'legacy') {
      return null;
    }

    const serie: string = row.ticketbai_serie?.trim() ?? '';

    const numero: string = row.ticketbai_numero?.trim() ?? '';

    if (serie === '' || numero === '') {
      throw new Error('La identidad fiscal TicketBAI del ticket está incompleta.');
    }

    const identificativo: string | null = this.normalizeNullableText(row.ticketbai_huella);

    const qr: string | null = this.normalizeNullableText(row.ticketbai_qr);

    const url: string | null = this.normalizeNullableText(row.ticketbai_url);

    if (
      row.ticketbai_estado === 'aceptada' &&
      (identificativo === null || qr === null || url === null)
    ) {
      throw new Error('Los datos fiscales TicketBAI aceptados están incompletos.');
    }

    return {
      serie,
      numero,
      identificativo,
      qr,
      url,
    };
  }

  /**
   * Normaliza un texto fiscal nullable recuperado de SQLite.
   */
  private normalizeNullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalizedValue: string = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
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
