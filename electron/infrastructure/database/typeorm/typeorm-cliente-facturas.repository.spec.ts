import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import type { ClienteFacturaVentaDisponibleRecord } from '@backend/domain/clientes/cliente-factura-venta-record.interface';
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
    await seedVentas(dataSource);

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

  it('recupera únicamente las ventas disponibles para una factura nueva', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    expect(result).toEqual([
      {
        id: 10,
        publicId: 'venta-historica',
        serie: '',
        numero: 10,
        fecha: '2026-09-12T10:00:00.000Z',
        totalCents: 1_500,
        incluidaEnBorrador: false,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            nombre: 'Efectivo',
            importeCents: 1_500,
          },
        ],
      },
      {
        id: 1,
        publicId: 'venta-disponible',
        serie: '',
        numero: 1,
        fecha: '2026-09-11T10:00:00.000Z',
        totalCents: 1_000,
        incluidaEnBorrador: false,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            nombre: 'Efectivo',
            importeCents: 600,
          },
          {
            tipoPagoPublicId: 'tipo-pago-tarjeta',
            nombre: 'Tarjeta',
            importeCents: 400,
          },
        ],
      },
    ]);
  });

  it('incluye y marca las ventas pertenecientes al propio borrador', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', 'factura-borrador');

    expect(
      result.map((venta: ClienteFacturaVentaDisponibleRecord): string => venta.publicId),
    ).toEqual(['venta-historica', 'venta-disponible', 'venta-borrador']);

    expect(
      result.find(
        (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
          venta.publicId === 'venta-borrador',
      )?.incluidaEnBorrador,
    ).toBe(true);

    expect(
      result
        .filter(
          (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
            venta.publicId !== 'venta-borrador',
        )
        .every((venta: ClienteFacturaVentaDisponibleRecord): boolean => !venta.incluidaEnBorrador),
    ).toBe(true);
  });

  it('excluye devoluciones, operaciones mixtas y relaciones activas ajenas', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', 'factura-borrador');

    const publicIds: readonly string[] = result.map(
      (venta: ClienteFacturaVentaDisponibleRecord): string => venta.publicId,
    );

    expect(publicIds).not.toContain('venta-mixta');
    expect(publicIds).not.toContain('venta-devolucion');
    expect(publicIds).not.toContain('venta-negativa');
    expect(publicIds).not.toContain('venta-eliminada');
    expect(publicIds).not.toContain('venta-otro-cliente');
    expect(publicIds).not.toContain('venta-facturada');
    expect(publicIds).not.toContain('venta-cero');
  });

  it('no devuelve ventas para clientes inexistentes o inactivos', async (): Promise<void> => {
    expect(await requireRepository().findVentasDisponibles('cliente-inexistente', null)).toEqual(
      [],
    );

    expect(await requireRepository().findVentasDisponibles('cliente-inactivo', null)).toEqual([]);
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
 * Inserta ventas disponibles, bloqueadas, eliminadas y con
 * devolución para probar todas las reglas de elegibilidad.
 */
async function seedVentas(dataSource: DataSource): Promise<void> {
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
    INSERT INTO tipo_pago (
      id,
      public_id,
      nombre,
      slug,
      afecta_caja,
      orden,
      fisico,
      activo
    )
    VALUES
      (
        1,
        'tipo-pago-efectivo',
        'Efectivo',
        'efectivo',
        1,
        1,
        1,
        1
      ),
      (
        2,
        'tipo-pago-tarjeta',
        'Tarjeta',
        'tarjeta',
        0,
        2,
        1,
        1
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
      '2026-09-01T08:00:00.000Z'
    )
  `);

  await dataSource.query(`
    INSERT INTO venta (
      id,
      public_id,
      id_caja,
      id_empleado,
      id_cliente,
      id_venta_origen_devolucion,
      numero,
      total_cents,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES
      (
        1,
        'venta-disponible',
        1,
        1,
        1,
        NULL,
        1,
        1000,
        '2026-09-11T10:00:00.000Z',
        '2026-09-11T10:00:00.000Z',
        NULL
      ),
      (
        2,
        'venta-mixta',
        1,
        1,
        1,
        NULL,
        2,
        500,
        '2026-09-10T10:00:00.000Z',
        '2026-09-10T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'venta-devolucion',
        1,
        1,
        1,
        1,
        3,
        -1000,
        '2026-09-09T10:00:00.000Z',
        '2026-09-09T10:00:00.000Z',
        NULL
      ),
      (
        4,
        'venta-negativa',
        1,
        1,
        1,
        NULL,
        4,
        -500,
        '2026-09-08T10:00:00.000Z',
        '2026-09-08T10:00:00.000Z',
        NULL
      ),
      (
        5,
        'venta-eliminada',
        1,
        1,
        1,
        NULL,
        5,
        2500,
        '2026-09-07T10:00:00.000Z',
        '2026-09-07T10:00:00.000Z',
        '2026-09-07T11:00:00.000Z'
      ),
      (
        6,
        'venta-otro-cliente',
        1,
        1,
        2,
        NULL,
        6,
        4000,
        '2026-09-06T10:00:00.000Z',
        '2026-09-06T10:00:00.000Z',
        NULL
      ),
      (
        7,
        'venta-facturada',
        1,
        1,
        1,
        NULL,
        7,
        3000,
        '2026-09-05T10:00:00.000Z',
        '2026-09-05T10:00:00.000Z',
        NULL
      ),
      (
        8,
        'venta-borrador',
        1,
        1,
        1,
        NULL,
        8,
        2000,
        '2026-09-04T09:00:00.000Z',
        '2026-09-04T09:00:00.000Z',
        NULL
      ),
      (
        9,
        'venta-cero',
        1,
        1,
        1,
        NULL,
        9,
        0,
        '2026-09-03T10:00:00.000Z',
        '2026-09-03T10:00:00.000Z',
        NULL
      ),
      (
        10,
        'venta-historica',
        1,
        1,
        1,
        NULL,
        10,
        1500,
        '2026-09-12T10:00:00.000Z',
        '2026-09-12T10:00:00.000Z',
        NULL
      ),
      (
        11,
        'venta-cliente-inactivo',
        1,
        1,
        3,
        NULL,
        11,
        1000,
        '2026-09-02T10:00:00.000Z',
        '2026-09-02T10:00:00.000Z',
        NULL
      )
  `);

  await dataSource.query(`
    INSERT INTO linea_venta (
      id,
      public_id,
      id_venta,
      id_linea_venta_origen_devolucion,
      localizador,
      marca,
      nombre_articulo,
      pvp_micros,
      importe_micros,
      unidades
    )
    VALUES
      (1, 'linea-1', 1, NULL, 1001, 'Marca', 'Disponible', 10000000, 10000000, 1),
      (2, 'linea-2', 2, NULL, 1002, 'Marca', 'Parte positiva', 5000000, 10000000, 2),
      (3, 'linea-3', 2, 1, 1001, 'Marca', 'Parte devuelta', 5000000, -5000000, -1),
      (4, 'linea-4', 3, 1, 1001, 'Marca', 'Devolución', 10000000, -10000000, -1),
      (5, 'linea-5', 4, NULL, 1004, 'Marca', 'Negativa', 5000000, -5000000, -1),
      (6, 'linea-6', 5, NULL, 1005, 'Marca', 'Eliminada', 25000000, 25000000, 1),
      (7, 'linea-7', 6, NULL, 1006, 'Marca', 'Otro cliente', 40000000, 40000000, 1),
      (8, 'linea-8', 7, NULL, 1007, 'Marca', 'Facturada', 30000000, 30000000, 1),
      (9, 'linea-9', 8, NULL, 1008, 'Marca', 'Borrador', 20000000, 20000000, 1),
      (10, 'linea-10', 9, NULL, 1009, 'Marca', 'Cero', 0, 0, 0),
      (11, 'linea-11', 10, NULL, 1010, 'Marca', 'Histórica', 15000000, 15000000, 1),
      (12, 'linea-12', 11, NULL, 1011, 'Marca', 'Cliente inactivo', 10000000, 10000000, 1)
  `);

  await dataSource.query(`
    INSERT INTO venta_pago (
      id,
      public_id,
      id_venta,
      id_tipo_pago,
      orden,
      importe_cents
    )
    VALUES
      (1, 'pago-venta-1-efectivo', 1, 1, 0, 600),
      (2, 'pago-venta-1-tarjeta', 1, 2, 1, 400),
      (3, 'pago-venta-8', 8, 2, 0, 2000),
      (4, 'pago-venta-10', 10, 1, 0, 1500)
  `);

  await dataSource.query(`
    INSERT INTO factura_venta (
      id_factura,
      id_venta,
      activa
    )
    VALUES
      (1, 7, 1),
      (2, 8, 1),
      (3, 10, 0)
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
