import type VentasContextRepository from '@backend/contracts/ventas/ventas-context.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type {
  TerminalRecord,
  TipoPagoRecord,
  VentasContextRecord,
} from '@backend/domain/ventas/ventas-context-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface TerminalDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly nombre: string;
  readonly codigo: string;
}

interface CajaAbiertaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_terminal: number;
  readonly apertura: string;
  readonly importe_apertura_cents: number;
}

interface TipoPagoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly foto_relative_path: string | null;
  readonly afecta_caja: number;
  readonly orden: number;
  readonly fisico: number;
}

/**
 * Obtiene de SQLite el contexto operativo que necesita el módulo de ventas.
 */
export default class TypeOrmVentasContextRepository implements VentasContextRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene el terminal actual, su caja abierta y los tipos de pago disponibles.
   */
  async get(): Promise<VentasContextRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const terminal: TerminalRecord = await this.getTerminal(dataSource);

    const [cajaAbierta, tiposPago]: [CajaAbiertaRecord | null, readonly TipoPagoRecord[]] =
      await Promise.all([
        this.getCajaAbierta(dataSource, terminal.id),
        this.getTiposPago(dataSource),
      ]);

    return {
      terminal,
      cajaAbierta,
      tiposPago,
    };
  }

  /**
   * Obtiene el único terminal activo de la instalación monopuesto.
   */
  private async getTerminal(dataSource: DataSource): Promise<TerminalRecord> {
    const rows: readonly TerminalDatabaseRow[] = (await dataSource.query(`
      SELECT
        t.id,
        t.public_id,
        t.nombre,
        t.codigo
      FROM terminal t
      WHERE
        t.activo = 1
        AND t.deleted_at IS NULL
      ORDER BY t.id
      LIMIT 2
    `)) as readonly TerminalDatabaseRow[];

    if (rows.length === 0) {
      throw new Error('No se ha encontrado ningún terminal activo.');
    }

    if (rows.length > 1) {
      throw new Error('La instalación monopuesto contiene más de un terminal activo.');
    }

    const row: TerminalDatabaseRow = rows[0];

    return {
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      codigo: row.codigo,
    };
  }

  /**
   * Obtiene la caja actualmente abierta para el terminal indicado.
   */
  private async getCajaAbierta(
    dataSource: DataSource,
    terminalId: number,
  ): Promise<CajaAbiertaRecord | null> {
    const rows: readonly CajaAbiertaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_terminal,
          c.apertura,
          c.importe_apertura_cents
        FROM caja c
        WHERE
          c.id_terminal = ?
          AND c.cierre IS NULL
        ORDER BY
          c.apertura DESC,
          c.id DESC
        LIMIT 1
      `,
      [terminalId],
    )) as readonly CajaAbiertaDatabaseRow[];

    const row: CajaAbiertaDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      publicId: row.public_id,
      idTerminal: row.id_terminal,
      apertura: row.apertura,
      importeAperturaCents: row.importe_apertura_cents,
    };
  }

  /**
   * Obtiene los tipos de pago activos ordenados para su uso en ventas.
   */
  private async getTiposPago(dataSource: DataSource): Promise<readonly TipoPagoRecord[]> {
    const rows: readonly TipoPagoDatabaseRow[] = (await dataSource.query(`
      SELECT
        tp.id,
        tp.public_id,
        tp.nombre,
        tp.slug,
        a.relative_path AS foto_relative_path,
        tp.afecta_caja,
        tp.orden,
        tp.fisico
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
    `)) as readonly TipoPagoDatabaseRow[];

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
