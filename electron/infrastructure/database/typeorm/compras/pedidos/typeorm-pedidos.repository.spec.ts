import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type {
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TypeOrmPedidosRepository from './typeorm-pedidos.repository';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmPedidosRepository | null = null;

describe('TypeOrmPedidosRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-pedidos-'));
    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'pedidos.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

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
 * Obtiene el repository inicializado por el test.
 */
function requireRepository(): TypeOrmPedidosRepository {
  if (repository === null) {
    throw new Error('El repository de Pedidos no está inicializado.');
  }

  return repository;
}

/**
 * Inserta proveedores y pedidos representativos.
 */
async function seedPedidos(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO proveedor (
      id,
      public_id,
      nombre,
      deleted_at
    )
    VALUES
      (1, 'provider-1', 'Proveedor Uno', NULL),
      (2, 'provider-2', 'Proveedor Histórico', '2026-06-01T00:00:00.000Z'),
      (3, 'provider-3', 'Proveedor Sin Pedidos', NULL)
  `);

  await dataSource.query(`
    INSERT INTO pedido (
      id,
      public_id,
      id_proveedor,
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
}
