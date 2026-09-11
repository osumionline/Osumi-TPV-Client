import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type PedidoLineaRecord from '@backend/domain/compras/pedidos/pedido-linea-record.interface';
import type {
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmPedidosRepository from '@infrastructure/database/typeorm/compras/pedidos/typeorm-pedidos.repository';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface PedidoPersistenceDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_proveedor: number;
  readonly id_tipo_pago: number | null;
  readonly forma_pago: string | null;
  readonly tipo: string;
  readonly numero: string | null;
  readonly importe_micros: number;
  readonly portes_micros: number;
  readonly descuento_bps: number;
  readonly fecha_pago: string | null;
  readonly fecha_pedido: string | null;
  readonly recargo_equivalencia: number;
  readonly europeo: number;
  readonly recepcionado: number;
  readonly observaciones: string | null;
  readonly deleted_at: string | null;
}

interface PedidoColumnDatabaseRow {
  readonly id_columna: number;
  readonly visible: number;
}

interface PedidoDeletedAtDatabaseRow {
  readonly deleted_at: string | null;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let dataSource: DataSource | null = null;
let repository: TypeOrmPedidosRepository | null = null;

describe('TypeOrmPedidosRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-pedidos-'));
    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'pedidos.sqlite'),
      new TypeOrmDataSourceFactory(),
    );
    dataSource = await applicationDatabase.connect();

    for (const schema of completeDatabaseSchema) {
      for (const statement of schema.statements) {
        await dataSource.query(statement);
      }
    }

    await seedPedidos(dataSource);

    repository = new TypeOrmPedidosRepository(applicationDatabase);
  });

  afterEach(async (): Promise<void> => {
    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    dataSource = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('separa pendientes y recepcionados con orden estable', async (): Promise<void> => {
    const guardados: PedidosGuardadosResultadoRecord =
      await requireRepository().searchPedidosGuardados(createQuery());
    const recepcionados: PedidosRecepcionadosResultadoRecord =
      await requireRepository().searchPedidosRecepcionados(createQuery());

    expect(guardados.totalRows).toBe(2);
    expect(guardados.rows.map((row): number => row.id)).toEqual([1, 2]);

    expect(recepcionados.totalRows).toBe(2);
    expect(recepcionados.rows.map((row): number => row.id)).toEqual([3, 4]);
    expect(recepcionados.rows[0]).toMatchObject({
      proveedorNombre: 'Proveedor Uno',
      europeo: true,
      numero: '#000051640',
      importeMicros: 603_990_000,
    });
  });

  it('combina fecha, proveedor, número e importe', async (): Promise<void> => {
    const result: PedidosRecepcionadosResultadoRecord =
      await requireRepository().searchPedidosRecepcionados(
        createQuery({
          fechaDesde: '2026-05-01',
          fechaHasta: '2026-05-31',
          idProveedor: 1,
          numero: '51640',
          importeDesdeMicros: 600_000_000,
          importeHastaMicros: 610_000_000,
        }),
      );

    expect(result.totalRows).toBe(1);
    expect(result.rows.map((row): number => row.id)).toEqual([3]);
  });

  it('pagina sin alterar el total del conjunto filtrado', async (): Promise<void> => {
    const result: PedidosGuardadosResultadoRecord =
      await requireRepository().searchPedidosGuardados(
        createQuery({
          limit: 1,
          offset: 1,
        }),
      );

    expect(result.totalRows).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe(2);
  });

  it('mantiene proveedores históricos disponibles para filtrar', async (): Promise<void> => {
    const result = await requireRepository().getPedidoFilterOptions();

    expect(result.proveedores).toEqual([
      {
        idProveedor: 2,
        nombre: 'Proveedor Histórico',
      },
      {
        idProveedor: 3,
        nombre: 'Proveedor Sin Pedidos',
      },
      {
        idProveedor: 1,
        nombre: 'Proveedor Uno',
      },
    ]);
  });

  it('excluye pedidos eliminados lógicamente', async (): Promise<void> => {
    const guardados: PedidosGuardadosResultadoRecord =
      await requireRepository().searchPedidosGuardados(createQuery());

    expect(guardados.rows.some((row): boolean => row.id === 5)).toBe(false);
  });

  it('recupera la cabecera y únicamente las columnas opcionales visibles', async (): Promise<void> => {
    const result: PedidoCabeceraRecord | null = await requireRepository().getPedido(1);

    expect(result).toEqual({
      id: 1,
      publicId: 'order-pending-1',
      idProveedor: 1,
      proveedorNombre: 'Proveedor Uno',
      idTipoPago: 10,
      formaPago: 'Tarjeta histórica',
      tipo: 'factura',
      numero: 'ORD-1077436',
      fechaPedido: '2026-09-10',
      fechaPago: '2026-09-10',
      fechaRecepcionado: null,
      recargoEquivalencia: true,
      europeo: false,
      recepcionado: false,
      observaciones: 'Pedido pendiente reciente',
      columnasVisibles: [1, 4],
    });

    await expect(requireRepository().getPedido(999)).resolves.toBeNull();
  });

  it('recupera únicamente proveedores y tipos de pago activos para la ficha', async (): Promise<void> => {
    const result: PedidoFormOptionsRecord = await requireRepository().getPedidoFormOptions();

    expect(result).toEqual({
      proveedores: [
        {
          idProveedor: 3,
          nombre: 'Proveedor Sin Pedidos',
        },
        {
          idProveedor: 1,
          nombre: 'Proveedor Uno',
        },
      ],
      tiposPago: [
        {
          idTipoPago: 11,
          nombre: 'Paypal',
        },
        {
          idTipoPago: 10,
          nombre: 'Tarjeta',
        },
      ],
    });
  });

  it('crea un pedido pendiente sin modificar valores económicos y persiste sus columnas', async (): Promise<void> => {
    const idPedido: number = await requireRepository().savePedido(
      createSaveRecord({
        columnasVisibles: [1, 4, 8],
      }),
    );

    expect(idPedido).toBeGreaterThan(5);

    const row: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(idPedido);

    expect(row).toMatchObject({
      id: idPedido,
      id_proveedor: 1,
      id_tipo_pago: null,
      forma_pago: 'Domiciliación bancaria',
      tipo: 'factura',
      numero: 'NEW-001',
      importe_micros: 0,
      portes_micros: 0,
      descuento_bps: 0,
      fecha_pago: null,
      fecha_pedido: '2026-09-11',
      recargo_equivalencia: 0,
      europeo: 0,
      recepcionado: 0,
      observaciones: 'Pedido nuevo',
      deleted_at: null,
    });
    expect(row.public_id).not.toBe('');

    expect(await readOptionalColumns(idPedido)).toEqual([
      {
        id_columna: 1,
        visible: 1,
      },
      {
        id_columna: 4,
        visible: 1,
      },
      {
        id_columna: 5,
        visible: 0,
      },
      {
        id_columna: 6,
        visible: 0,
      },
      {
        id_columna: 8,
        visible: 1,
      },
      {
        id_columna: 9,
        visible: 0,
      },
      {
        id_columna: 11,
        visible: 0,
      },
      {
        id_columna: 13,
        visible: 0,
      },
    ]);
  });

  it('actualiza un pedido conservando su identidad persistida', async (): Promise<void> => {
    const before: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(1);

    const idPedido: number = await requireRepository().savePedido(
      createSaveRecord({
        id: 1,
        idProveedor: 3,
        formaPago: 'Transferencia bancaria',
        tipo: 'abono',
        numero: 'AB-UPDATED',
        fechaPedido: '2026-09-09',
        fechaPago: '2026-09-10',
        recargoEquivalencia: false,
        europeo: true,
        observaciones: 'Pedido actualizado',
        columnasVisibles: [4, 11],
      }),
    );

    expect(idPedido).toBe(1);

    const after: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(1);

    expect(after).toMatchObject({
      id: 1,
      public_id: before.public_id,
      id_proveedor: 3,
      id_tipo_pago: null,
      forma_pago: 'Transferencia bancaria',
      tipo: 'abono',
      numero: 'AB-UPDATED',
      fecha_pago: '2026-09-10',
      fecha_pedido: '2026-09-09',
      recargo_equivalencia: 0,
      europeo: 1,
      recepcionado: 0,
      observaciones: 'Pedido actualizado',
      deleted_at: null,
    });
  });

  it('usa el nombre canónico al seleccionar un tipo de pago configurable', async (): Promise<void> => {
    const idPedido: number = await requireRepository().savePedido(
      createSaveRecord({
        idTipoPago: 10,
        formaPago: 'Texto que no debe persistirse',
      }),
    );

    const row: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(idPedido);

    expect(row.id_tipo_pago).toBe(10);
    expect(row.forma_pago).toBe('Tarjeta');
  });

  it('conserva el snapshot histórico si se mantiene el mismo tipo de pago', async (): Promise<void> => {
    const currentDataSource: DataSource = requireDataSource();

    await currentDataSource.query(
      `
        UPDATE tipo_pago
        SET nombre = ?
        WHERE id = ?
      `,
      ['Tarjeta Renombrada', 10],
    );

    await requireRepository().savePedido(
      createSaveRecord({
        id: 1,
        idTipoPago: 10,
        formaPago: null,
        recargoEquivalencia: true,
        columnasVisibles: [1, 4],
      }),
    );

    const row: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(1);

    expect(row.id_tipo_pago).toBe(10);
    expect(row.forma_pago).toBe('Tarjeta histórica');
  });

  it('actualiza la visibilidad de todas las columnas opcionales', async (): Promise<void> => {
    await requireRepository().savePedido(
      createSaveRecord({
        id: 1,
        recargoEquivalencia: true,
        columnasVisibles: [5, 13],
      }),
    );

    expect(await readOptionalColumns(1)).toEqual([
      {
        id_columna: 1,
        visible: 0,
      },
      {
        id_columna: 4,
        visible: 0,
      },
      {
        id_columna: 5,
        visible: 1,
      },
      {
        id_columna: 6,
        visible: 0,
      },
      {
        id_columna: 8,
        visible: 0,
      },
      {
        id_columna: 9,
        visible: 0,
      },
      {
        id_columna: 11,
        visible: 0,
      },
      {
        id_columna: 13,
        visible: 1,
      },
    ]);

    await requireRepository().savePedido(
      createSaveRecord({
        id: 1,
        recargoEquivalencia: true,
        columnasVisibles: [4, 6],
      }),
    );

    expect(await readOptionalColumns(1)).toEqual([
      {
        id_columna: 1,
        visible: 0,
      },
      {
        id_columna: 4,
        visible: 1,
      },
      {
        id_columna: 5,
        visible: 0,
      },
      {
        id_columna: 6,
        visible: 1,
      },
      {
        id_columna: 8,
        visible: 0,
      },
      {
        id_columna: 9,
        visible: 0,
      },
      {
        id_columna: 11,
        visible: 0,
      },
      {
        id_columna: 13,
        visible: 0,
      },
    ]);
  });

  it('impide modificar R.E. de un pedido recepcionado', async (): Promise<void> => {
    await expect(
      requireRepository().savePedido(
        createSaveRecord({
          id: 3,
          idTipoPago: 11,
          formaPago: 'Paypal',
          numero: '#000051640',
          fechaPedido: '2026-05-26',
          fechaPago: '2026-05-29',
          recargoEquivalencia: false,
          europeo: true,
          observaciones: null,
          columnasVisibles: [],
        }),
      ),
    ).rejects.toThrow(
      'El Recargo de Equivalencia de un pedido recepcionado no se puede modificar.',
    );

    const row: PedidoPersistenceDatabaseRow = await readPedidoPersistenceRow(3);

    expect(row.recargo_equivalencia).toBe(1);
  });

  it('elimina lógicamente un pedido pendiente', async (): Promise<void> => {
    await requireRepository().deletePedido(1);

    const rows: readonly PedidoDeletedAtDatabaseRow[] = (await requireDataSource().query(
      `
          SELECT deleted_at
          FROM pedido
          WHERE id = ?
        `,
      [1],
    )) as readonly PedidoDeletedAtDatabaseRow[];

    expect(rows[0]?.deleted_at).not.toBeNull();
    await expect(requireRepository().getPedido(1)).resolves.toBeNull();
  });

  it('usa stock canónico actual en líneas pendientes y respeta su orden', async (): Promise<void> => {
    const result: readonly PedidoLineaRecord[] = await requireRepository().getPedidoLineas(1);

    expect(result.map((line): number => line.id)).toEqual([101, 100]);

    expect(result[0]).toMatchObject({
      id: 101,
      orden: 0,
      idArticulo: 11,
      localizador: 102,
      nombreArticulo: 'Artículo B snapshot',
      referencia: 'REF-B',
      marcaNombre: 'Marca Uno',
      unidades: 2,
      stockActual: -2,
      stockFinal: 0,
    });

    expect(result[1]).toMatchObject({
      id: 100,
      orden: 1,
      idArticulo: 10,
      localizador: 101,
      nombreArticulo: 'Artículo A snapshot',
      referencia: 'REF-A',
      marcaNombre: 'Marca Uno',
      codigoBarras: 'BC-A',
      unidades: 3,
      stockActual: 7,
      stockFinal: 10,
      palbMicros: 10_000_000,
      pucMicros: 12_705_000,
      pvpMicros: 19_950_000,
      ivaBps: 2100,
      recargoEquivalenciaBps: 520,
      descuentoBps: 0,
    });
  });

  it('usa exclusivamente snapshots de stock en pedidos recepcionados', async (): Promise<void> => {
    const result: readonly PedidoLineaRecord[] = await requireRepository().getPedidoLineas(3);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 200,
      idArticulo: 10,
      stockActual: 4,
      stockFinal: 9,
    });
  });

  it('no inventa stock para líneas legacy recepcionadas sin snapshots', async (): Promise<void> => {
    const result: readonly PedidoLineaRecord[] = await requireRepository().getPedidoLineas(4);

    expect(result).toEqual([
      {
        id: 201,
        publicId: 'order-line-201',
        orden: 0,
        idArticulo: null,
        localizador: null,
        nombreArticulo: 'Artículo legacy sin vínculo',
        referencia: null,
        marcaNombre: null,
        codigoBarras: 'LEGACY',
        unidades: 2,
        stockActual: null,
        stockFinal: null,
        palbMicros: 5_000_000,
        pucMicros: 6_050_000,
        pvpMicros: 9_000_000,
        margenMicroporcentaje: 32_777_778,
        ivaBps: 2100,
        recargoEquivalenciaBps: 0,
        descuentoBps: 0,
      },
    ]);
  });

  it('impide eliminar un pedido recepcionado', async (): Promise<void> => {
    await expect(requireRepository().deletePedido(3)).rejects.toThrow(
      'Un pedido recepcionado no se puede eliminar.',
    );

    const rows: readonly PedidoDeletedAtDatabaseRow[] = (await requireDataSource().query(
      `
          SELECT deleted_at
          FROM pedido
          WHERE id = ?
        `,
      [3],
    )) as readonly PedidoDeletedAtDatabaseRow[];

    expect(rows[0]?.deleted_at).toBeNull();
  });
});

/**
 * Construye una consulta de repository representativa.
 */
function createQuery(overrides: Partial<PedidoRepositoryQuery> = {}): PedidoRepositoryQuery {
  return {
    fechaDesde: null,
    fechaHasta: null,
    idProveedor: null,
    numero: null,
    importeDesdeMicros: null,
    importeHastaMicros: null,
    offset: 0,
    limit: 20,
    ...overrides,
  };
}

/**
 * Construye un comando válido de persistencia de cabecera.
 */
function createSaveRecord(overrides: Partial<PedidoSaveRecord> = {}): PedidoSaveRecord {
  return {
    id: null,
    idProveedor: 1,
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    tipo: 'factura',
    numero: 'NEW-001',
    fechaPedido: '2026-09-11',
    fechaPago: null,
    recargoEquivalencia: false,
    europeo: false,
    observaciones: 'Pedido nuevo',
    columnasVisibles: [1, 4, 8],
    ...overrides,
  };
}

/**
 * Obtiene el repository inicializado por el test.
 */
function requireRepository(): TypeOrmPedidosRepository {
  if (repository === null) {
    throw new Error('El repository de Pedidos no está inicializado.');
  }

  return repository;
}

/**
 * Obtiene la conexión SQLite inicializada por el test.
 */
function requireDataSource(): DataSource {
  if (dataSource === null) {
    throw new Error('La base de datos de Pedidos no está inicializada.');
  }

  return dataSource;
}

/**
 * Recupera el estado persistido de una cabecera de Pedido.
 */
async function readPedidoPersistenceRow(idPedido: number): Promise<PedidoPersistenceDatabaseRow> {
  const rows: readonly PedidoPersistenceDatabaseRow[] = (await requireDataSource().query(
    `
        SELECT
          id,
          public_id,
          id_proveedor,
          id_tipo_pago,
          forma_pago,
          tipo,
          numero,
          importe_micros,
          portes_micros,
          descuento_bps,
          fecha_pago,
          fecha_pedido,
          recargo_equivalencia,
          europeo,
          recepcionado,
          observaciones,
          deleted_at
        FROM pedido
        WHERE id = ?
      `,
    [idPedido],
  )) as readonly PedidoPersistenceDatabaseRow[];

  const row: PedidoPersistenceDatabaseRow | undefined = rows[0];

  if (row === undefined) {
    throw new Error(`No existe el pedido ${idPedido}.`);
  }

  return row;
}

/**
 * Recupera el estado de todas las columnas opcionales persistidas.
 */
async function readOptionalColumns(idPedido: number): Promise<readonly PedidoColumnDatabaseRow[]> {
  return (await requireDataSource().query(
    `
      SELECT
        id_columna,
        visible
      FROM vista_pedido
      WHERE
        id_pedido = ?
        AND id_columna IN (
          1,
          4,
          5,
          6,
          8,
          9,
          11,
          13
        )
      ORDER BY id_columna
    `,
    [idPedido],
  )) as readonly PedidoColumnDatabaseRow[];
}

/**
 * Inserta proveedores, formas de pago, pedidos y
 * configuración representativa para los tests.
 */
async function seedPedidos(currentDataSource: DataSource): Promise<void> {
  await currentDataSource.query(`
    INSERT INTO proveedor (
      id,
      public_id,
      nombre,
      deleted_at
    )
    VALUES
      (1, 'provider-1', 'Proveedor Uno', NULL),
      (
        2,
        'provider-2',
        'Proveedor Histórico',
        '2026-06-01T00:00:00.000Z'
      ),
      (
        3,
        'provider-3',
        'Proveedor Sin Pedidos',
        NULL
      )
  `);

  await currentDataSource.query(`
    INSERT INTO tipo_pago (
      id,
      public_id,
      nombre,
      slug,
      orden,
      activo,
      deleted_at
    )
    VALUES
      (
        10,
        'payment-card',
        'Tarjeta',
        'tarjeta',
        2,
        1,
        NULL
      ),
      (
        11,
        'payment-paypal',
        'Paypal',
        'paypal',
        1,
        1,
        NULL
      ),
      (
        12,
        'payment-disabled',
        'Desactivado',
        'desactivado',
        0,
        0,
        NULL
      ),
      (
        13,
        'payment-deleted',
        'Eliminado',
        'eliminado',
        0,
        1,
        '2026-01-01T00:00:00.000Z'
      )
  `);

  await currentDataSource.query(`
    INSERT INTO marca (
      id,
      public_id,
      nombre
    )
    VALUES (
      1,
      'brand-1',
      'Marca Uno'
    )
  `);

  await currentDataSource.query(`
    INSERT INTO articulo (
      id,
      public_id,
      localizador,
      nombre,
      slug,
      id_marca,
      referencia,
      stock
    )
    VALUES
      (
        10,
        'article-10',
        101,
        'Artículo actual A',
        'articulo-actual-a',
        1,
        'REF-A',
        7
      ),
      (
        11,
        'article-11',
        102,
        'Artículo actual B',
        'articulo-actual-b',
        1,
        'REF-B',
        -2
      )
  `);

  await currentDataSource.query(`
    INSERT INTO pedido (
      id,
      public_id,
      id_proveedor,
      id_tipo_pago,
      forma_pago,
      tipo,
      numero,
      importe_micros,
      fecha_pago,
      fecha_pedido,
      fecha_recepcionado,
      recargo_equivalencia,
      europeo,
      recepcionado,
      observaciones,
      deleted_at
    )
    VALUES
      (
        1,
        'order-pending-1',
        1,
        10,
        'Tarjeta histórica',
        'factura',
        'ORD-1077436',
        28670000,
        '2026-09-10',
        '2026-09-10',
        NULL,
        1,
        0,
        0,
        'Pedido pendiente reciente',
        NULL
      ),
      (
        2,
        'order-pending-2',
        2,
        NULL,
        'Domiciliación bancaria',
        'albaran',
        'ALB-HIST',
        100000000,
        NULL,
        '2026-08-01 10:30:00',
        NULL,
        0,
        0,
        0,
        NULL,
        NULL
      ),
      (
        3,
        'order-received-1',
        1,
        11,
        'Paypal',
        'factura',
        '#000051640',
        603990000,
        '2026-05-29',
        '2026-05-26',
        '2026-05-29T12:00:00.000Z',
        1,
        1,
        1,
        NULL,
        NULL
      ),
      (
        4,
        'order-received-2',
        2,
        NULL,
        'Transferencia bancaria',
        'abono',
        'AB-001',
        171440000,
        '2026-03-04',
        '2026-03-04',
        '2026-03-12T11:00:00.000Z',
        0,
        0,
        1,
        'Pedido histórico',
        NULL
      ),
      (
        5,
        'order-deleted',
        1,
        NULL,
        NULL,
        'factura',
        'DELETED',
        999000000,
        NULL,
        '2026-09-11',
        NULL,
        0,
        0,
        0,
        NULL,
        '2026-09-11T12:00:00.000Z'
      )
  `);

  await currentDataSource.query(`
    INSERT INTO linea_pedido (
      id,
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
    VALUES
      (
        100,
        'order-line-100',
        1,
        1,
        10,
        'Artículo A snapshot',
        'BC-A',
        3,
        100,
        103,
        10000000,
        12705000,
        19950000,
        36315789,
        2100,
        520,
        0
      ),
      (
        101,
        'order-line-101',
        1,
        0,
        11,
        'Artículo B snapshot',
        NULL,
        2,
        NULL,
        NULL,
        20000000,
        24200000,
        30000000,
        19333333,
        1000,
        140,
        500
      ),
      (
        200,
        'order-line-200',
        3,
        0,
        10,
        'Artículo recibido snapshot',
        'BC-R',
        5,
        4,
        9,
        10000000,
        12705000,
        19950000,
        36315789,
        2100,
        520,
        0
      ),
      (
        201,
        'order-line-201',
        4,
        0,
        NULL,
        'Artículo legacy sin vínculo',
        'LEGACY',
        2,
        NULL,
        NULL,
        5000000,
        6050000,
        9000000,
        32777778,
        2100,
        0,
        0
      )
  `);

  await currentDataSource.query(`
    INSERT INTO vista_pedido (
      id_pedido,
      id_columna,
      visible
    )
    VALUES
      (1, 1, 1),
      (1, 2, 1),
      (1, 4, 1),
      (1, 5, 0)
  `);
}
