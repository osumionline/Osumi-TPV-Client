import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface TipoPagoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly afecta_caja: number;
  readonly orden: number;
  readonly fisico: number;
  readonly foto_relative_path: string | null;
}

export default class TypeOrmTipoPagoRepository implements TipoPagoRepository {
  /**
   * Crea el repository de Tipos de pago.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera todos los tipos de pago activos
   * ordenados por su prioridad.
   */
  async findAll(): Promise<readonly TipoPagoRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly TipoPagoDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            tp.id,
            tp.public_id,
            tp.nombre,
            tp.slug,
            tp.afecta_caja,
            tp.orden,
            tp.fisico,
            a.relative_path
              AS foto_relative_path
          FROM tipo_pago tp

          LEFT JOIN archivo a
            ON a.id = tp.id_archivo
            AND a.deleted_at IS NULL

          WHERE
            tp.activo = 1
            AND tp.deleted_at IS NULL

          ORDER BY
            tp.orden,
            tp.nombre COLLATE NOCASE,
            tp.id
        `,
    )) as readonly TipoPagoDatabaseRow[];

    return rows.map((row: TipoPagoDatabaseRow): TipoPagoRecord => ({
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      slug: row.slug,
      fotoRelativePath: row.foto_relative_path,
      afectaCaja: row.afecta_caja === 1,
      orden: row.orden,
      fisico: row.fisico === 1,
    }));
  }
}
