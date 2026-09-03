import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
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
