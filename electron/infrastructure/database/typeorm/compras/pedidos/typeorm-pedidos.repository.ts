import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidoGuardadoRowRecord,
  PedidoRecepcionadoRowRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import escapeLike from '@infrastructure/database/typeorm/typeorm-like.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import type {
  DatabaseIdRow,
  PedidoCabeceraDatabaseRow,
  PedidoCountDatabaseRow,
  PedidoCurrentStateDatabaseRow,
  PedidoListadoDatabaseRow,
  PedidoProveedorFilterDatabaseRow,
  PedidoSqlFilter,
  PedidoTipoPagoOptionDatabaseRow,
  PedidoVisibleColumnDatabaseRow,
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
   * Recupera la cabecera de un pedido y su configuración opcional de columnas.
   */
  async getPedido(idPedido: number): Promise<PedidoCabeceraRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly PedidoCabeceraDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        pe.id,
        pe.public_id,
        pe.id_proveedor,
        p.nombre AS proveedor_nombre,
        pe.id_tipo_pago,
        pe.forma_pago,
        pe.tipo,
        pe.numero,
        pe.fecha_pedido,
        pe.fecha_pago,
        pe.fecha_recepcionado,
        pe.recargo_equivalencia,
        pe.europeo,
        pe.recepcionado,
        pe.observaciones
      FROM pedido pe
      INNER JOIN proveedor p
        ON p.id = pe.id_proveedor
      WHERE
        pe.id = ?
        AND pe.deleted_at IS NULL
      LIMIT 1
    `,
      [idPedido],
    )) as readonly PedidoCabeceraDatabaseRow[];

    const row: PedidoCabeceraDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    const visibleRows: readonly PedidoVisibleColumnDatabaseRow[] = (await dataSource.query(
      `
        SELECT id_columna
        FROM vista_pedido
        WHERE
          id_pedido = ?
          AND visible = 1
        ORDER BY id_columna
      `,
      [idPedido],
    )) as readonly PedidoVisibleColumnDatabaseRow[];

    return {
      id: row.id,
      publicId: row.public_id,
      idProveedor: row.id_proveedor,
      proveedorNombre: row.proveedor_nombre,
      idTipoPago: row.id_tipo_pago,
      formaPago: row.forma_pago,
      tipo: row.tipo,
      numero: row.numero,
      fechaPedido: row.fecha_pedido,
      fechaPago: row.fecha_pago,
      fechaRecepcionado: row.fecha_recepcionado,
      recargoEquivalencia: row.recargo_equivalencia === 1,
      europeo: row.europeo === 1,
      recepcionado: row.recepcionado === 1,
      observaciones: row.observaciones,
      columnasVisibles: visibleRows
        .map((visibleRow: PedidoVisibleColumnDatabaseRow): number => visibleRow.id_columna)
        .filter((idColumna: number): boolean => PEDIDO_OPTIONAL_COLUMN_IDS.includes(idColumna)),
    };
  }

  /**
   * Recupera las opciones activas de la cabecera de Pedido.
   */
  async getPedidoFormOptions(): Promise<PedidoFormOptionsRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const proveedores: readonly PedidoProveedorFilterDatabaseRow[] = (await dataSource.query(`
      SELECT
        id AS id_proveedor,
        nombre
      FROM proveedor
      WHERE deleted_at IS NULL
      ORDER BY nombre COLLATE NOCASE, id
    `)) as readonly PedidoProveedorFilterDatabaseRow[];

    const tiposPago: readonly PedidoTipoPagoOptionDatabaseRow[] = (await dataSource.query(`
      SELECT
        id AS id_tipo_pago,
        nombre
      FROM tipo_pago
      WHERE
        activo = 1
        AND deleted_at IS NULL
      ORDER BY
        orden,
        nombre COLLATE NOCASE,
        id
    `)) as readonly PedidoTipoPagoOptionDatabaseRow[];

    return {
      proveedores: proveedores.map((proveedor: PedidoProveedorFilterDatabaseRow) => ({
        idProveedor: proveedor.id_proveedor,
        nombre: proveedor.nombre,
      })),
      tiposPago: tiposPago.map((tipoPago: PedidoTipoPagoOptionDatabaseRow) => ({
        idTipoPago: tipoPago.id_tipo_pago,
        nombre: tipoPago.nombre,
      })),
    };
  }

  /**
   * Crea o actualiza únicamente la cabecera de un pedido.
   */
  async savePedido(command: PedidoSaveRecord): Promise<number> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<number> => {
        const current: PedidoCurrentStateDatabaseRow | null =
          command.id === null ? null : await this.requireCurrentPedido(queryRunner, command.id);

        await this.requireProveedor(
          queryRunner,
          command.idProveedor,
          current?.id_proveedor ?? null,
        );

        const formaPago: string | null = await this.resolveFormaPago(queryRunner, command, current);

        if (
          current !== null &&
          current.recepcionado === 1 &&
          command.recargoEquivalencia !== (current.recargo_equivalencia === 1)
        ) {
          throw new Error(
            'El Recargo de Equivalencia de un pedido recepcionado no se puede modificar.',
          );
        }

        const timestamp: string = new Date().toISOString();
        let idPedido: number;

        if (command.id === null) {
          await queryRunner.query(
            `
            INSERT INTO pedido (
              public_id,
              id_proveedor,
              id_tipo_pago,
              forma_pago,
              tipo,
              numero,
              fecha_pago,
              fecha_pedido,
              recargo_equivalencia,
              europeo,
              observaciones,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              randomUUID(),
              command.idProveedor,
              command.idTipoPago,
              formaPago,
              command.tipo,
              command.numero,
              command.fechaPago,
              command.fechaPedido,
              command.recargoEquivalencia ? 1 : 0,
              command.europeo ? 1 : 0,
              command.observaciones,
              timestamp,
              timestamp,
            ],
          );

          idPedido = await this.readLastInsertedId(queryRunner);
        } else {
          idPedido = command.id;

          await queryRunner.query(
            `
            UPDATE pedido
            SET
              id_proveedor = ?,
              id_tipo_pago = ?,
              forma_pago = ?,
              tipo = ?,
              numero = ?,
              fecha_pago = ?,
              fecha_pedido = ?,
              recargo_equivalencia = ?,
              europeo = ?,
              observaciones = ?,
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
            [
              command.idProveedor,
              command.idTipoPago,
              formaPago,
              command.tipo,
              command.numero,
              command.fechaPago,
              command.fechaPedido,
              current?.recepcionado === 1
                ? current.recargo_equivalencia
                : command.recargoEquivalencia
                  ? 1
                  : 0,
              command.europeo ? 1 : 0,
              command.observaciones,
              timestamp,
              idPedido,
            ],
          );
        }

        await this.syncOptionalColumns(queryRunner, idPedido, command.columnasVisibles, timestamp);

        return idPedido;
      },
    );
  }

  /**
   * Da de baja un pedido pendiente.
   */
  async deletePedido(idPedido: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const current: PedidoCurrentStateDatabaseRow = await this.requireCurrentPedido(
        queryRunner,
        idPedido,
      );

      if (current.recepcionado === 1) {
        throw new Error('Un pedido recepcionado no se puede eliminar.');
      }

      const timestamp: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE pedido
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, idPedido],
      );
    });
  }

  /**
   * Obtiene el estado mínimo necesario para editar un pedido existente.
   */
  private async requireCurrentPedido(
    queryRunner: QueryRunner,
    idPedido: number,
  ): Promise<PedidoCurrentStateDatabaseRow> {
    const rows: readonly PedidoCurrentStateDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          id_proveedor,
          id_tipo_pago,
          forma_pago,
          recargo_equivalencia,
          recepcionado
        FROM pedido
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [idPedido],
    )) as readonly PedidoCurrentStateDatabaseRow[];

    const row: PedidoCurrentStateDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('El pedido indicado no existe.');
    }

    return row;
  }

  /**
   * Comprueba que el proveedor sea utilizable por el pedido.
   */
  private async requireProveedor(
    queryRunner: QueryRunner,
    idProveedor: number,
    currentIdProveedor: number | null,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM proveedor
      WHERE
        id = ?
        AND (
          deleted_at IS NULL
          OR id = ?
        )
      LIMIT 1
    `,
      [idProveedor, currentIdProveedor],
    )) as readonly DatabaseIdRow[];

    if (rows.length === 0) {
      throw new Error('El proveedor seleccionado no está disponible.');
    }
  }

  /**
   * Conserva snapshots históricos de forma de pago y usa
   * el nombre canónico al seleccionar un tipo nuevo.
   */
  private async resolveFormaPago(
    queryRunner: QueryRunner,
    command: PedidoSaveRecord,
    current: PedidoCurrentStateDatabaseRow | null,
  ): Promise<string | null> {
    if (command.idTipoPago === null) {
      return command.formaPago;
    }

    if (current?.id_tipo_pago === command.idTipoPago) {
      return command.formaPago ?? current.forma_pago;
    }

    const rows: readonly {
      readonly nombre: string;
    }[] = (await queryRunner.query(
      `
      SELECT nombre
      FROM tipo_pago
      WHERE
        id = ?
        AND activo = 1
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [command.idTipoPago],
    )) as readonly {
      readonly nombre: string;
    }[];

    const nombre: string | undefined = rows[0]?.nombre;

    if (nombre === undefined) {
      throw new Error('La forma de pago seleccionada no está disponible.');
    }

    return nombre;
  }

  /**
   * Persiste únicamente la visibilidad de columnas opcionales.
   */
  private async syncOptionalColumns(
    queryRunner: QueryRunner,
    idPedido: number,
    visibleColumnIds: readonly number[],
    timestamp: string,
  ): Promise<void> {
    const visibleIds: ReadonlySet<number> = new Set<number>(visibleColumnIds);

    for (const idColumna of PEDIDO_OPTIONAL_COLUMN_IDS) {
      await queryRunner.query(
        `
        INSERT INTO vista_pedido (
          id_pedido,
          id_columna,
          visible,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (
          id_pedido,
          id_columna
        )
        DO UPDATE SET
          visible = excluded.visible,
          updated_at = excluded.updated_at
      `,
        [idPedido, idColumna, visibleIds.has(idColumna) ? 1 : 0, timestamp, timestamp],
      );
    }
  }

  /**
   * Obtiene el identificador autoincremental recién creado.
   */
  private async readLastInsertedId(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      'SELECT last_insert_rowid() AS id',
    )) as readonly DatabaseIdRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('No se ha podido obtener el identificador del nuevo pedido.');
    }

    return id;
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
