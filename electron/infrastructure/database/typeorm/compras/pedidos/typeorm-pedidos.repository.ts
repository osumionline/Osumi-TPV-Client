import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type PedidoArticuloRecord from '@backend/domain/compras/pedidos/pedido-articulo-record.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type PedidoLineaRecord from '@backend/domain/compras/pedidos/pedido-linea-record.interface';
import type PedidoLineaSaveRecord from '@backend/domain/compras/pedidos/pedido-linea-save-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidoGuardadoRowRecord,
  PedidoRecepcionadoRowRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import { MONEY_SCALE, UNIT_PRICE_SCALE } from '@backend/domain/database/database-schema.constants';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import {
  PEDIDO_ARTICULO_SELECT,
  PEDIDO_TIENE_CODIGO_BARRAS_ADICIONAL_SQL,
  type DatabaseIdRow,
  type PedidoArticuloDatabaseRow,
  type PedidoArticuloLineaSnapshotDatabaseRow,
  type PedidoCabeceraDatabaseRow,
  type PedidoCountDatabaseRow,
  type PedidoCurrentStateDatabaseRow,
  type PedidoLineaDatabaseRow,
  type PedidoLineaIdentityDatabaseRow,
  type PedidoListadoDatabaseRow,
  type PedidoProveedorFilterDatabaseRow,
  type PedidoSqlFilter,
  type PedidoTipoPagoOptionDatabaseRow,
  type PedidoVisibleColumnDatabaseRow,
} from '@infrastructure/database/typeorm/compras/pedidos/typeorm-pedidos.repository.private';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import escapeLike from '@infrastructure/database/typeorm/typeorm-like.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

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
   * Recupera las líneas de un pedido utilizando stock
   * actual para pendientes y snapshots para recepcionados.
   */
  async getPedidoLineas(idPedido: number): Promise<readonly PedidoLineaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly PedidoLineaDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            lp.id,
            lp.public_id,
            lp.orden,
            lp.id_articulo,
            a.localizador,
            lp.nombre_articulo,
            a.referencia,
            m.nombre AS marca_nombre,
            lp.codigo_barras,
            ${PEDIDO_TIENE_CODIGO_BARRAS_ADICIONAL_SQL} AS tiene_codigo_barras_adicional,
            lp.unidades,

            CASE
              WHEN pe.recepcionado = 1
                THEN lp.stock_actual_snapshot
              ELSE a.stock
            END AS stock_actual,

            CASE
              WHEN pe.recepcionado = 1
                THEN lp.stock_final_snapshot
              WHEN a.id IS NULL
                THEN NULL
              ELSE a.stock + lp.unidades
            END AS stock_final,

            lp.palb_micros,
            lp.puc_micros,
            lp.pvp_micros,
            lp.margen_microporcentaje,
            lp.iva_bps,
            lp.recargo_equivalencia_bps,
            lp.descuento_bps
          FROM linea_pedido lp
          INNER JOIN pedido pe
            ON pe.id = lp.id_pedido
            AND pe.deleted_at IS NULL
          LEFT JOIN articulo a
            ON a.id = lp.id_articulo
          LEFT JOIN marca m
            ON m.id = a.id_marca
          WHERE lp.id_pedido = ?
          ORDER BY
            lp.orden,
            lp.id
        `,
      [idPedido],
    )) as readonly PedidoLineaDatabaseRow[];

    return rows.map((row: PedidoLineaDatabaseRow): PedidoLineaRecord => ({
      id: row.id,
      publicId: row.public_id,
      orden: row.orden,
      idArticulo: row.id_articulo,
      localizador: row.localizador,
      nombreArticulo: row.nombre_articulo,
      referencia: row.referencia,
      marcaNombre: row.marca_nombre,
      codigoBarras: row.codigo_barras,
      tieneCodigoBarrasAdicional: row.tiene_codigo_barras_adicional === 1,
      unidades: row.unidades,
      stockActual: row.stock_actual,
      stockFinal: row.stock_final,
      palbMicros: row.palb_micros,
      pucMicros: row.puc_micros,
      pvpMicros: row.pvp_micros,
      margenMicroporcentaje: row.margen_microporcentaje,
      ivaBps: row.iva_bps,
      recargoEquivalenciaBps: row.recargo_equivalencia_bps,
      descuentoBps: row.descuento_bps,
    }));
  }

  /**
   * Resuelve un artículo activo mediante acceso directo,
   * localizador o cualquiera de sus códigos de barras activos.
   */
  async resolvePedidoArticulo(
    codigo: string,
    codigoNumerico: number | null,
  ): Promise<PedidoArticuloRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly PedidoArticuloDatabaseRow[] =
      codigoNumerico === null
        ? await this.resolvePedidoArticuloByBarcode(dataSource, codigo)
        : await this.resolvePedidoArticuloByNumericCode(dataSource, codigo, codigoNumerico);

    const row: PedidoArticuloDatabaseRow | undefined = rows[0];

    return row === undefined ? null : this.mapPedidoArticulo(row);
  }

  /**
   * Busca artículos activos por su slug normalizado.
   */
  async searchPedidoArticulos(searchPattern: string): Promise<readonly PedidoArticuloRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly PedidoArticuloDatabaseRow[] = (await dataSource.query(
      `
          ${PEDIDO_ARTICULO_SELECT}
          WHERE
            a.deleted_at IS NULL
            AND a.slug LIKE ? COLLATE NOCASE
          ORDER BY
            a.nombre COLLATE NOCASE,
            a.id
        `,
      [searchPattern],
    )) as readonly PedidoArticuloDatabaseRow[];

    return rows.map((row: PedidoArticuloDatabaseRow): PedidoArticuloRecord =>
      this.mapPedidoArticulo(row),
    );
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
   * Crea o actualiza atómicamente un Pedido pendiente
   * junto con sus líneas y configuración visual.
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

        if (current?.recepcionado !== 1) {
          await this.syncPedidoLineas(queryRunner, idPedido, command.lineas);
        }

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
   * Sincroniza por completo las líneas editables de
   * un Pedido todavía pendiente.
   */
  private async syncPedidoLineas(
    queryRunner: QueryRunner,
    idPedido: number,
    lineas: readonly PedidoLineaSaveRecord[],
  ): Promise<void> {
    const currentRows: readonly PedidoLineaIdentityDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            id_articulo
          FROM linea_pedido
          WHERE id_pedido = ?
        `,
      [idPedido],
    )) as readonly PedidoLineaIdentityDatabaseRow[];

    const currentById: ReadonlyMap<number, PedidoLineaIdentityDatabaseRow> = new Map<
      number,
      PedidoLineaIdentityDatabaseRow
    >(
      currentRows.map(
        (row: PedidoLineaIdentityDatabaseRow): [number, PedidoLineaIdentityDatabaseRow] => [
          row.id,
          row,
        ],
      ),
    );

    const retainedIds: number[] = [];

    for (const linea of lineas) {
      if (linea.id === null) {
        continue;
      }

      const currentLine: PedidoLineaIdentityDatabaseRow | undefined = currentById.get(linea.id);

      if (currentLine === undefined) {
        throw new Error('Una línea del pedido no pertenece al pedido indicado.');
      }

      if (currentLine.id_articulo !== linea.idArticulo) {
        throw new Error('No se puede cambiar el artículo asociado a una línea del pedido.');
      }

      retainedIds.push(linea.id);
    }

    if (retainedIds.length === 0) {
      await queryRunner.query(
        `
        DELETE FROM linea_pedido
        WHERE id_pedido = ?
      `,
        [idPedido],
      );
    } else {
      const placeholders: string = retainedIds.map((): string => '?').join(', ');

      await queryRunner.query(
        `
        DELETE FROM linea_pedido
        WHERE
          id_pedido = ?
          AND id NOT IN (${placeholders})
      `,
        [idPedido, ...retainedIds],
      );
    }

    for (const linea of lineas) {
      if (linea.id === null) {
        await this.insertPedidoLinea(queryRunner, idPedido, linea);
      } else {
        await this.updatePedidoLinea(queryRunner, idPedido, linea);
      }
    }
  }

  /**
   * Inserta una línea nueva tomando del artículo
   * exclusivamente su snapshot identificativo.
   */
  private async insertPedidoLinea(
    queryRunner: QueryRunner,
    idPedido: number,
    linea: PedidoLineaSaveRecord,
  ): Promise<void> {
    if (linea.idArticulo === null) {
      throw new Error('Una línea nueva debe estar vinculada a un artículo.');
    }

    const articulo: PedidoArticuloLineaSnapshotDatabaseRow =
      await this.requirePedidoArticuloLineaSnapshot(queryRunner, linea.idArticulo);

    await queryRunner.query(
      `
      INSERT INTO linea_pedido (
        public_id,
        id_pedido,
        orden,
        id_articulo,
        nombre_articulo,
        codigo_barras,
        unidades,
        stock_actual_snapshot,
        stock_final_snapshot,
        palb_micros,
        puc_micros,
        pvp_micros,
        margen_microporcentaje,
        iva_bps,
        recargo_equivalencia_bps,
        descuento_bps
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, NULL, NULL,
        ?, ?, ?, ?, ?, ?, ?
      )
    `,
      [
        randomUUID(),
        idPedido,
        linea.orden,
        articulo.id,
        articulo.nombre,
        linea.codigoBarras,
        linea.unidades,
        linea.palbMicros,
        linea.pucMicros,
        linea.pvpMicros,
        linea.margenMicroporcentaje,
        linea.ivaBps,
        linea.recargoEquivalenciaBps,
        linea.descuentoBps,
      ],
    );
  }

  /**
   * Actualiza exclusivamente los datos editables de
   * una línea pendiente ya persistida.
   */
  private async updatePedidoLinea(
    queryRunner: QueryRunner,
    idPedido: number,
    linea: PedidoLineaSaveRecord,
  ): Promise<void> {
    if (linea.id === null) {
      throw new Error('La línea indicada no está persistida.');
    }

    await queryRunner.query(
      `
      UPDATE linea_pedido
      SET
        orden = ?,
        codigo_barras = ?,
        unidades = ?,
        stock_actual_snapshot = NULL,
        stock_final_snapshot = NULL,
        palb_micros = ?,
        puc_micros = ?,
        pvp_micros = ?,
        margen_microporcentaje = ?,
        iva_bps = ?,
        recargo_equivalencia_bps = ?,
        descuento_bps = ?
      WHERE
        id = ?
        AND id_pedido = ?
    `,
      [
        linea.orden,
        linea.codigoBarras,
        linea.unidades,
        linea.palbMicros,
        linea.pucMicros,
        linea.pvpMicros,
        linea.margenMicroporcentaje,
        linea.ivaBps,
        linea.recargoEquivalenciaBps,
        linea.descuentoBps,
        linea.id,
        idPedido,
      ],
    );
  }

  /**
   * Recupera el mínimo snapshot canónico necesario
   * para crear una línea nueva.
   */
  private async requirePedidoArticuloLineaSnapshot(
    queryRunner: QueryRunner,
    idArticulo: number,
  ): Promise<PedidoArticuloLineaSnapshotDatabaseRow> {
    const rows: readonly PedidoArticuloLineaSnapshotDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            nombre
          FROM articulo
          WHERE
            id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [idArticulo],
    )) as readonly PedidoArticuloLineaSnapshotDatabaseRow[];

    const articulo: PedidoArticuloLineaSnapshotDatabaseRow | undefined = rows[0];

    if (articulo === undefined) {
      throw new Error('El artículo seleccionado para una línea ya no está disponible.');
    }

    return articulo;
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
   * Resuelve un código numérico dando prioridad al acceso
   * directo y después al localizador.
   */
  private async resolvePedidoArticuloByNumericCode(
    dataSource: DataSource,
    codigo: string,
    codigoNumerico: number,
  ): Promise<readonly PedidoArticuloDatabaseRow[]> {
    return (await dataSource.query(
      `
        ${PEDIDO_ARTICULO_SELECT}
        WHERE
          a.deleted_at IS NULL
          AND (
            a.acceso_directo = ?
            OR a.localizador = ?
            OR EXISTS (
              SELECT 1
              FROM codigo_barras cb
              WHERE
                cb.id_articulo = a.id
                AND cb.codigo = ?
                AND cb.deleted_at IS NULL
            )
          )
        ORDER BY
          CASE
            WHEN a.acceso_directo = ? THEN 0
            WHEN a.localizador = ? THEN 1
            ELSE 2
          END,
          a.id
        LIMIT 1
      `,
      [codigoNumerico, codigoNumerico, codigo, codigoNumerico, codigoNumerico],
    )) as readonly PedidoArticuloDatabaseRow[];
  }

  /**
   * Resuelve un código no numérico exclusivamente
   * mediante códigos de barras activos.
   */
  private async resolvePedidoArticuloByBarcode(
    dataSource: DataSource,
    codigo: string,
  ): Promise<readonly PedidoArticuloDatabaseRow[]> {
    return (await dataSource.query(
      `
        ${PEDIDO_ARTICULO_SELECT}
        WHERE
          a.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM codigo_barras cb
            WHERE
              cb.id_articulo = a.id
              AND cb.codigo = ?
              AND cb.deleted_at IS NULL
          )
        ORDER BY a.id
        LIMIT 1
      `,
      [codigo],
    )) as readonly PedidoArticuloDatabaseRow[];
  }

  /**
   * Convierte un artículo SQLite en los datos canónicos
   * necesarios para crear una línea de Pedido.
   */
  private mapPedidoArticulo(row: PedidoArticuloDatabaseRow): PedidoArticuloRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      localizador: row.localizador,
      nombre: row.nombre,
      referencia: row.referencia,
      marcaNombre: row.marca_nombre,
      stock: row.stock,
      palbMicros: row.palb_micros,
      pucMicros: row.puc_micros,
      pvpMicros: (row.pvp_cents * UNIT_PRICE_SCALE) / MONEY_SCALE,
      margenMicroporcentaje: row.margen_microporcentaje,
      ivaBps: row.iva_bps,
      recargoEquivalenciaBps: row.re_bps,
      tieneCodigoBarrasAdicional: row.tiene_codigo_barras_adicional === 1,
      observaciones: row.observaciones,
      mostrarObservacionesPedidos: row.mostrar_observaciones_pedidos === 1,
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
