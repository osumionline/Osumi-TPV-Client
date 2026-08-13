import type VentasDevolucionesRepository from '@backend/contracts/ventas/ventas-devoluciones.repository.interface';
import type VentaDevolucionRecord from '@backend/domain/ventas/venta-devolucion-record.interface';
import type {
  VentaDevolucionLineaRecord,
  VentaDevolucionPagoRecord,
} from '@backend/domain/ventas/venta-devolucion-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface VentaDevolucionDatabaseRow {
  readonly id: number;
  readonly public_id: string;

  readonly serie: string;
  readonly numero: number;

  readonly fecha: string;
  readonly cliente: string | null;

  readonly total_cents: number;
}

interface VentaDevolucionPagoDatabaseRow {
  readonly nombre: string;
  readonly importe_cents: number;
}

interface VentaDevolucionLineaDatabaseRow {
  readonly id: number;
  readonly public_id: string;

  readonly id_articulo: number | null;
  readonly articulo_public_id: string | null;
  readonly localizador: number | null;

  readonly nombre: string;

  readonly puc_micros: number;
  readonly pvp_micros: number;
  readonly iva_bps: number;

  readonly importe_micros: number;

  readonly descuento_bps: number;
  readonly importe_descuento_micros: number;

  readonly unidades: number;
  readonly unidades_devueltas: number;
  readonly unidades_disponibles: number;

  readonly regalo: number;
}

export default class TypeOrmVentasDevolucionesRepository implements VentasDevolucionesRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera los datos históricos necesarios para realizar
   * una devolución de una venta concreta.
   */
  async findByVentaId(idVenta: number): Promise<VentaDevolucionRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const ventaRows: readonly VentaDevolucionDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              v.id,
              v.public_id,
              v.serie,
              v.numero,
              v.created_at AS fecha,
              c.nombre_apellidos AS cliente,
              v.total_cents
            FROM venta v
            LEFT JOIN cliente c
              ON c.id = v.id_cliente
            WHERE
              v.id = ?
              AND v.deleted_at IS NULL
            LIMIT 1
          `,
      [idVenta],
    )) as readonly VentaDevolucionDatabaseRow[];

    const venta: VentaDevolucionDatabaseRow | undefined = ventaRows[0];

    if (venta === undefined) {
      return null;
    }

    const pagos: readonly VentaDevolucionPagoRecord[] = await this.findPagos(dataSource, idVenta);

    const lineas: readonly VentaDevolucionLineaRecord[] = await this.findLineas(
      dataSource,
      idVenta,
    );

    return {
      id: venta.id,
      publicId: venta.public_id,

      serie: venta.serie,
      numero: venta.numero,

      fecha: venta.fecha,
      cliente: venta.cliente,

      totalCents: venta.total_cents,

      pagos,
      lineas,
    };
  }

  /**
   * Recupera los medios de pago utilizados originalmente.
   */
  private async findPagos(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaDevolucionPagoRecord[]> {
    const rows: readonly VentaDevolucionPagoDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              tp.nombre,
              vp.importe_cents
            FROM venta_pago vp
            INNER JOIN tipo_pago tp
              ON tp.id = vp.id_tipo_pago
            WHERE
              vp.id_venta = ?
            ORDER BY
              vp.orden,
              vp.id
          `,
      [idVenta],
    )) as readonly VentaDevolucionPagoDatabaseRow[];

    return rows.map((row: VentaDevolucionPagoDatabaseRow): VentaDevolucionPagoRecord => ({
      nombre: row.nombre,
      importeCents: row.importe_cents,
    }));
  }

  /**
   * Recupera las líneas originales y calcula cuántas
   * unidades continúan siendo devolvibles.
   */
  private async findLineas(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaDevolucionLineaRecord[]> {
    const rows: readonly VentaDevolucionLineaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              lv.id,
              lv.public_id,

              lv.id_articulo,
              a.public_id AS articulo_public_id,
              a.localizador,

              lv.nombre_articulo AS nombre,

              lv.puc_micros,
              lv.pvp_micros,
              lv.iva_bps,

              lv.importe_micros,

              lv.descuento_bps,
              lv.importe_descuento_micros,

              lv.unidades,
              lv.unidades_devueltas,

              CASE
                WHEN
                  lv.unidades > 0
                  AND lv.unidades > lv.unidades_devueltas
                THEN
                  lv.unidades - lv.unidades_devueltas
                ELSE
                  0
              END AS unidades_disponibles,

              lv.regalo
            FROM linea_venta lv
            LEFT JOIN articulo a
              ON a.id = lv.id_articulo
            WHERE
              lv.id_venta = ?
            ORDER BY
              lv.id
          `,
      [idVenta],
    )) as readonly VentaDevolucionLineaDatabaseRow[];

    return rows.map((row: VentaDevolucionLineaDatabaseRow): VentaDevolucionLineaRecord => ({
      id: row.id,
      publicId: row.public_id,

      idArticulo: row.id_articulo,
      articuloPublicId: row.articulo_public_id,
      localizador: row.localizador,

      nombre: row.nombre,

      pucMicros: row.puc_micros,
      pvpMicros: row.pvp_micros,
      ivaBps: row.iva_bps,

      importeMicros: row.importe_micros,

      descuentoBps: row.descuento_bps,
      importeDescuentoMicros: row.importe_descuento_micros,

      unidades: row.unidades,
      unidadesDevueltas: row.unidades_devueltas,
      unidadesDisponibles: row.unidades_disponibles,

      regalo: row.regalo === 1,
    }));
  }
}
