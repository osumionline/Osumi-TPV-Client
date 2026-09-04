import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmClienteFacturasRepository from '@infrastructure/database/typeorm/typeorm-cliente-facturas.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmClienteFacturasRepository | null = null;

describe('TypeOrmClienteFacturasRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-cliente-facturas-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'cliente-facturas.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedFacturas(dataSource);

    repository = new TypeOrmClienteFacturasRepository(applicationDatabase);
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

  it('recupera borradores, emitidas y anuladas usando la fecha correspondiente', async (): Promise<void> => {
    const result: readonly ClienteFacturaRecord[] =
      await requireRepository().findByClientePublicId('cliente-1');

    expect(result).toEqual([
      {
        publicId: 'factura-borrador',
        serie: '',
        numero: null,
        year: null,
        estado: 'borrador',
        importeCents: 5_000,
        fechaCreacion: '2026-09-04T10:00:00.000Z',
        fechaEmision: null,
        fechaAnulacion: null,
      },
      {
        publicId: 'factura-emitida',
        serie: '',
        numero: 7,
        year: 2026,
        estado: 'emitida',
        importeCents: 12_345,
        fechaCreacion: '2026-08-19T10:00:00.000Z',
        fechaEmision: '2026-08-20 09:00:00',
        fechaAnulacion: null,
      },
      {
        publicId: 'factura-anulada',
        serie: '',
        numero: 6,
        year: 2026,
        estado: 'anulada',
        importeCents: 8_750,
        fechaCreacion: '2026-07-14T10:00:00.000Z',
        fechaEmision: '2026-07-15T09:00:00.000Z',
        fechaAnulacion: '2026-09-03T12:00:00.000Z',
      },
    ]);
  });

  it('excluye borradores eliminados y facturas de otros clientes', async (): Promise<void> => {
    const result: readonly ClienteFacturaRecord[] =
      await requireRepository().findByClientePublicId('cliente-1');

    expect(result.map((factura: ClienteFacturaRecord): string => factura.publicId)).toEqual([
      'factura-borrador',
      'factura-emitida',
      'factura-anulada',
    ]);
  });

  it('devuelve una colección vacía para clientes inexistentes o inactivos', async (): Promise<void> => {
    expect(await requireRepository().findByClientePublicId('cliente-inexistente')).toEqual([]);

    expect(await requireRepository().findByClientePublicId('cliente-inactivo')).toEqual([]);
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
 * Inserta clientes y facturas con todos los estados
 * necesarios para probar la consulta.
 */
async function seedFacturas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO cliente (
      id,
      public_id,
      nombre_apellidos,
      deleted_at
    )
    VALUES
      (
        1,
        'cliente-1',
        'Cliente principal',
        NULL
      ),
      (
        2,
        'cliente-2',
        'Segundo cliente',
        NULL
      ),
      (
        3,
        'cliente-inactivo',
        'Cliente inactivo',
        '2026-09-01T10:00:00.000Z'
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
      importe_cents,
      fecha_emision,
      fecha_anulacion,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES
      (
        1,
        'factura-emitida',
        1,
        7,
        'emitida',
        'Cliente principal',
        12345,
        '2026-08-20 09:00:00',
        NULL,
        '2026-08-19T10:00:00.000Z',
        '2026-08-20T09:00:00.000Z',
        NULL
      ),
      (
        2,
        'factura-borrador',
        1,
        NULL,
        'borrador',
        'Cliente principal',
        5000,
        NULL,
        NULL,
        '2026-09-04T10:00:00.000Z',
        '2026-09-04T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'factura-anulada',
        1,
        6,
        'anulada',
        'Cliente principal',
        8750,
        '2026-07-15T09:00:00.000Z',
        '2026-09-03T12:00:00.000Z',
        '2026-07-14T10:00:00.000Z',
        '2026-09-03T12:00:00.000Z',
        NULL
      ),
      (
        4,
        'factura-borrador-eliminado',
        1,
        NULL,
        'borrador',
        'Cliente principal',
        2000,
        NULL,
        NULL,
        '2026-09-05T10:00:00.000Z',
        '2026-09-05T11:00:00.000Z',
        '2026-09-05T11:00:00.000Z'
      ),
      (
        5,
        'factura-otro-cliente',
        2,
        8,
        'emitida',
        'Segundo cliente',
        3000,
        '2026-09-04T11:00:00.000Z',
        NULL,
        '2026-09-04T10:00:00.000Z',
        '2026-09-04T11:00:00.000Z',
        NULL
      ),
      (
        6,
        'factura-cliente-inactivo',
        3,
        9,
        'emitida',
        'Cliente inactivo',
        4000,
        '2026-08-01T11:00:00.000Z',
        NULL,
        '2026-08-01T10:00:00.000Z',
        '2026-08-01T11:00:00.000Z',
        NULL
      )
  `);
}

/**
 * Devuelve el repository inicializado para la prueba.
 */
function requireRepository(): TypeOrmClienteFacturasRepository {
  if (repository === null) {
    throw new Error('El repository de facturas de Clientes no está inicializado.');
  }

  return repository;
}
