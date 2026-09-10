import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidoGuardadoRowRecord,
  PedidoRecepcionadoRowRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import escapeLike from '@infrastructure/database/typeorm/typeorm-like.utils';
import type { DataSource } from 'typeorm';
import type {
  PedidoCountDatabaseRow,
  PedidoListadoDatabaseRow,
  PedidoProveedorFilterDatabaseRow,
  PedidoSqlFilter,
} from './typeorm-pedidos.repository.private';

/**
 * Gestiona las consultas SQLite de los listados de Pedidos.
 */
export default class TypeOrmPedidosRepository implements PedidosRepository {
  /**
   * Crea el repository sobre la base operacional.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera una página de pedidos todavía pendientes.
   */
  async searchPedidosGuardados(
    query: PedidoRepositoryQuery,
  ): Promise<PedidosGuardadosResultadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const filter: PedidoSqlFilter = this.buildFilter(query, false);
    const totalRows: number = await this.countPedidos(dataSource, filter);
    const rows: readonly PedidoListadoDatabaseRow[] = await this.findPedidos(
      dataSource,
      filter,
      query,
      false,
    );

    return {
      rows: rows.map((row: PedidoListadoDatabaseRow): PedidoGuardadoRowRecord =>
        this.mapGuardadoRow(row),
      ),
      totalRows,
    };
  }

  /**
   * Recupera una página de pedidos recepcionados.
   */
  async searchPedidosRecepcionados(
    query: PedidoRepositoryQuery,
  ): Promise<PedidosRecepcionadosResultadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const filter: PedidoSqlFilter = this.buildFilter(query, true);
    const totalRows: number = await this.countPedidos(dataSource, filter);
    const rows: readonly PedidoListadoDatabaseRow[] = await this.findPedidos(
      dataSource,
      filter,
      query,
      true,
    );

    return {
      rows: rows.map((row: PedidoListadoDatabaseRow): PedidoRecepcionadoRowRecord => ({
        ...this.mapGuardadoRow(row),
        fechaRecepcionado: row.fecha_recepcionado,
        fechaPago: row.fecha_pago,
        europeo: row.europeo === 1,
      })),
      totalRows,
    };
  }

  /**
   * Recupera proveedores activos y proveedores históricos
   * que todavía aparecen en algún pedido no eliminado.
   */
  async getPedidoFilterOptions(): Promise<PedidoFilterOptionsRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const rows: readonly PedidoProveedorFilterDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          p.id AS id_proveedor,
          p.nombre
        FROM proveedor p
        WHERE
          p.deleted_at IS NULL
          OR EXISTS (
            SELECT 1
            FROM pedido pe
            WHERE
              pe.id_proveedor = p.id
              AND pe.deleted_at IS NULL
          )
        ORDER BY
          p.nombre COLLATE NOCASE,
          p.id
      `,
    )) as readonly PedidoProveedorFilterDatabaseRow[];

    return {
      proveedores: rows.map((row: PedidoProveedorFilterDatabaseRow) => ({
        idProveedor: row.id_proveedor,
        nombre: row.nombre,
      })),
    };
  }

  /**
   * Cuenta todos los pedidos pertenecientes al conjunto filtrado.
   */
  private async countPedidos(dataSource: DataSource, filter: PedidoSqlFilter): Promise<number> {
    const rows: readonly PedidoCountDatabaseRow[] = (await dataSource.query(
      `
        SELECT COUNT(*) AS total_rows
        FROM pedido pe
        WHERE ${filter.clause}
      `,
      filter.parameters,
    )) as readonly PedidoCountDatabaseRow[];

    return rows[0]?.total_rows ?? 0;
  }

  /**
   * Recupera las filas paginadas del conjunto filtrado.
   */
  private async findPedidos(
    dataSource: DataSource,
    filter: PedidoSqlFilter,
    query: PedidoRepositoryQuery,
    recepcionado: boolean,
  ): Promise<readonly PedidoListadoDatabaseRow[]> {
    const orderBy: string = recepcionado
      ? `
          pe.fecha_recepcionado DESC,
          pe.fecha_pedido DESC,
          pe.id DESC
        `
      : `
          pe.fecha_pedido DESC,
          pe.id DESC
        `;

    return (await dataSource.query(
      `
        SELECT
          pe.id,
          pe.public_id,
          pe.fecha_pedido,
          pe.fecha_recepcionado,
          pe.fecha_pago,
          pe.id_proveedor,
          p.nombre AS proveedor_nombre,
          pe.tipo,
          pe.numero,
          pe.importe_micros,
          pe.observaciones,
          pe.europeo
        FROM pedido pe
        INNER JOIN proveedor p
          ON p.id = pe.id_proveedor
        WHERE ${filter.clause}
        ORDER BY ${orderBy}
        LIMIT ?
        OFFSET ?
      `,
      [...filter.parameters, query.limit, query.offset],
    )) as readonly PedidoListadoDatabaseRow[];
  }

  /**
   * Construye el filtro SQL común de los dos listados.
   */
  private buildFilter(query: PedidoRepositoryQuery, recepcionado: boolean): PedidoSqlFilter {
    const conditions: string[] = ['pe.deleted_at IS NULL', 'pe.recepcionado = ?'];
    const parameters: (number | string)[] = [recepcionado ? 1 : 0];

    if (query.fechaDesde !== null) {
      conditions.push('substr(pe.fecha_pedido, 1, 10) >= ?');
      parameters.push(query.fechaDesde);
    }

    if (query.fechaHasta !== null) {
      conditions.push('substr(pe.fecha_pedido, 1, 10) <= ?');
      parameters.push(query.fechaHasta);
    }

    if (query.idProveedor !== null) {
      conditions.push('pe.id_proveedor = ?');
      parameters.push(query.idProveedor);
    }

    if (query.numero !== null) {
      conditions.push(`pe.numero LIKE ? ESCAPE '\\'`);
      parameters.push(`%${escapeLike(query.numero)}%`);
    }

    if (query.importeDesdeMicros !== null) {
      conditions.push('pe.importe_micros >= ?');
      parameters.push(query.importeDesdeMicros);
    }

    if (query.importeHastaMicros !== null) {
      conditions.push('pe.importe_micros <= ?');
      parameters.push(query.importeHastaMicros);
    }

    return {
      clause: conditions.join(' AND '),
      parameters,
    };
  }

  /**
   * Convierte una fila SQLite en el snapshot público de un pedido pendiente.
   */
  private mapGuardadoRow(row: PedidoListadoDatabaseRow): PedidoGuardadoRowRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      fechaPedido: row.fecha_pedido,
      idProveedor: row.id_proveedor,
      proveedorNombre: row.proveedor_nombre,
      tipo: row.tipo,
      numero: row.numero,
      importeMicros: row.importe_micros,
      observaciones: row.observaciones,
    };
  }
}
