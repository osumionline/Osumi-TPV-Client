import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type {
  ClienteFacturaEstadoRecord,
  ClienteFacturaRecord,
} from '@backend/domain/clientes/cliente-factura-record.interface';
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
}
