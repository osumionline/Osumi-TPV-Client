import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
import type {
  ClienteSumaVentaRecord,
  ClienteTopVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmClienteRepository from '@infrastructure/database/typeorm/typeorm-cliente.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface ClienteStateDatabaseRow {
  readonly deleted_at: string | null;
  readonly updated_at: string;
}

interface RelationCountDatabaseRow {
  readonly ventas: number;
  readonly facturas: number;
  readonly relaciones: number;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmClienteRepository | null = null;

describe('TypeOrmClienteRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-clientes-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'clientes.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedClienteHistory(dataSource);

    repository = new TypeOrmClienteRepository(applicationDatabase);
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

  it('da de baja el cliente conservando ventas, facturas y relaciones', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const result: ClienteDeactivateResult = await requireRepository().deactivate('cliente-1');

    expect(result).toBe('deactivated');
    expect(await requireRepository().findAll()).toEqual([]);

    const clienteRows: readonly ClienteStateDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          deleted_at,
          updated_at
        FROM cliente
        WHERE public_id = 'cliente-1'
      `,
    )) as readonly ClienteStateDatabaseRow[];

    expect(clienteRows[0]?.deleted_at).not.toBeNull();
    expect(clienteRows[0]?.updated_at).toBe(clienteRows[0]?.deleted_at);

    const relationRows: readonly RelationCountDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM venta
            WHERE id_cliente = 1
          ) AS ventas,
          (
            SELECT COUNT(*)
            FROM factura
            WHERE id_cliente = 1
          ) AS facturas,
          (
            SELECT COUNT(*)
            FROM factura_venta
          ) AS relaciones
      `,
    )) as readonly RelationCountDatabaseRow[];

    expect(relationRows[0]).toEqual({
      ventas: 1,
      facturas: 2,
      relaciones: 1,
    });
  });

  it('bloquea la baja cuando existe una factura activa en borrador', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(`
      INSERT INTO factura (
        public_id,
        id_cliente,
        estado,
        nombre_apellidos
      )
      VALUES (
        'factura-borrador-activa',
        1,
        'borrador',
        'Cliente de prueba'
      )
    `);

    const result: ClienteDeactivateResult = await requireRepository().deactivate('cliente-1');

    expect(result).toBe('has_draft_invoices');

    const clienteRows: readonly ClienteStateDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          deleted_at,
          updated_at
        FROM cliente
        WHERE public_id = 'cliente-1'
      `,
    )) as readonly ClienteStateDatabaseRow[];

    expect(clienteRows[0]?.deleted_at).toBeNull();
  });

  it('devuelve not_found para un cliente inexistente o ya inactivo', async (): Promise<void> => {
    const currentRepository: TypeOrmClienteRepository = requireRepository();

    expect(await currentRepository.deactivate('cliente-inexistente')).toBe('not_found');
    expect(await currentRepository.deactivate('cliente-1')).toBe('deactivated');
    expect(await currentRepository.deactivate('cliente-1')).toBe('not_found');
  });

  it('agrega por año y mes importes firmados y excluye ventas ajenas o eliminadas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await seedClienteStatistics(dataSource);

    const result: readonly ClienteSumaVentaRecord[] =
      await requireRepository().findSumaVentas('cliente-1');

    expect(result).toEqual([
      {
        year: 2025,
        month: 12,
        pucMicros: 9_000_000,
        pvpMicros: 30_000_000,
      },
      {
        year: 2026,
        month: 1,
        pucMicros: 4_000_000,
        pvpMicros: 20_000_000,
      },
      {
        year: 2026,
        month: 2,
        pucMicros: -4_000_000,
        pvpMicros: -20_000_000,
      },
    ]);
  });

  it('ordena el top principalmente por importe real y después por unidades', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await seedClienteStatistics(dataSource);

    const result: readonly ClienteTopVentaRecord[] = await requireRepository().findTopVentas(
      'cliente-1',
      10,
    );

    expect(result).toEqual([
      {
        localizador: null,
        nombre: 'Importe alto',
        unidades: 1,
        importeMicros: 20_000_000,
      },
      {
        localizador: null,
        nombre: 'Muchas unidades',
        unidades: 10,
        importeMicros: 10_000_000,
      },
    ]);
  });
});

/**
 * Crea el esquema SQLite real de la aplicación.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('PRAGMA foreign_keys = ON');

  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta un cliente con una venta, una factura emitida y un
 * borrador ya eliminado para comprobar la conservación histórica.
 */
async function seedClienteHistory(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      id,
      public_id,
      nombre,
      codigo
    )
    VALUES (
      1,
      'terminal-1',
      'Terminal de prueba',
      'TEST-1'
    )
  `);

  await dataSource.query(`
    INSERT INTO empleado (
      id,
      public_id,
      nombre,
      password_hash,
      password_algorithm,
      color,
      admin,
      activo
    )
    VALUES (
      1,
      'empleado-1',
      'Empleado de prueba',
      'hash-prueba',
      'scrypt',
      'FFFFFF',
      1,
      1
    )
  `);

  await dataSource.query(`
    INSERT INTO cliente (
      id,
      public_id,
      nombre_apellidos
    )
    VALUES (
      1,
      'cliente-1',
      'Cliente de prueba'
    )
  `);

  await dataSource.query(`
    INSERT INTO caja (
      id,
      public_id,
      id_terminal,
      id_empleado_apertura,
      apertura
    )
    VALUES (
      1,
      'caja-1',
      1,
      1,
      '2026-09-03T08:00:00.000Z'
    )
  `);

  await dataSource.query(`
    INSERT INTO venta (
      id,
      public_id,
      id_caja,
      id_empleado,
      id_cliente,
      numero,
      total_cents
    )
    VALUES (
      1,
      'venta-1',
      1,
      1,
      1,
      1,
      1000
    )
  `);

  await dataSource.query(`
    INSERT INTO factura (
      id,
      public_id,
      id_cliente,
      numero,
      estado,
      nombre_apellidos,
      importe_cents
    )
    VALUES
      (
        1,
        'factura-emitida',
        1,
        1,
        'emitida',
        'Cliente de prueba',
        1000
      ),
      (
        2,
        'factura-borrador-eliminada',
        1,
        NULL,
        'borrador',
        'Cliente de prueba',
        0
      )
  `);

  await dataSource.query(`
    UPDATE factura
    SET deleted_at = '2026-09-03T09:00:00.000Z'
    WHERE public_id = 'factura-borrador-eliminada'
  `);

  await dataSource.query(`
    INSERT INTO factura_venta (
      id_factura,
      id_venta
    )
    VALUES (
      1,
      1
    )
  `);
}

/**
 * Inserta ventas suficientes para probar agregaciones,
 * devoluciones, ordenación y exclusiones.
 */
async function seedClienteStatistics(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO cliente (
      id,
      public_id,
      nombre_apellidos
    )
    VALUES (
      2,
      'cliente-2',
      'Otro cliente'
    )
  `);

  await dataSource.query(`
    INSERT INTO venta (
      id,
      public_id,
      id_caja,
      id_empleado,
      id_cliente,
      numero,
      total_cents,
      created_at,
      deleted_at
    )
    VALUES
      (
        2,
        'venta-estadistica-1',
        1,
        1,
        1,
        2,
        3000,
        '2025-12-10T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'venta-estadistica-2',
        1,
        1,
        1,
        3,
        2000,
        '2026-01-10T10:00:00.000Z',
        NULL
      ),
      (
        4,
        'venta-estadistica-3',
        1,
        1,
        1,
        4,
        -2000,
        '2026-02-10T10:00:00.000Z',
        NULL
      ),
      (
        5,
        'venta-estadistica-eliminada',
        1,
        1,
        1,
        5,
        99900,
        '2026-03-10T10:00:00.000Z',
        '2026-03-10T11:00:00.000Z'
      ),
      (
        6,
        'venta-otro-cliente',
        1,
        1,
        2,
        6,
        99900,
        '2026-04-10T10:00:00.000Z',
        NULL
      )
  `);

  await dataSource.query(`
    INSERT INTO linea_venta (
      public_id,
      id_venta,
      localizador,
      nombre_articulo,
      puc_micros,
      pvp_micros,
      importe_micros,
      unidades
    )
    VALUES
      (
        'linea-muchas-unidades',
        2,
        100001,
        'Muchas unidades',
        500000,
        1000000,
        10000000,
        10
      ),
      (
        'linea-importe-alto-1',
        2,
        100002,
        'Importe alto',
        4000000,
        20000000,
        20000000,
        1
      ),
      (
        'linea-importe-alto-2',
        3,
        100002,
        'Importe alto',
        4000000,
        20000000,
        20000000,
        1
      ),
      (
        'linea-devolucion',
        4,
        100002,
        'Importe alto',
        4000000,
        20000000,
        -20000000,
        -1
      ),
      (
        'linea-venta-eliminada',
        5,
        100003,
        'No debe aparecer',
        1000000,
        999000000,
        999000000,
        1
      ),
      (
        'linea-otro-cliente',
        6,
        100004,
        'Tampoco debe aparecer',
        1000000,
        999000000,
        999000000,
        1
      )
  `);
}

/**
 * Devuelve el repository inicializado para el test.
 */
function requireRepository(): TypeOrmClienteRepository {
  if (repository === null) {
    throw new Error('El repository de Clientes no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la conexión de aplicación inicializada para el test.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de Clientes no está inicializada.');
  }

  return applicationDatabase;
}
