import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmCajaRepository from '@infrastructure/database/typeorm/typeorm-caja.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface CajaAggregateRow {
  readonly movimientos_salida_cents: number;
}

interface MovimientoRow {
  readonly concepto: string;
  readonly importe_cents: number;
  readonly descripcion: string | null;
  readonly deleted_at: string | null;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmCajaRepository | null = null;

describe('TypeOrmCajaRepository salidas', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-caja-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'caja.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    for (const schema of completeDatabaseSchema) {
      const databaseSchema: DatabaseSchemaDefinition = schema;

      for (const statement of databaseSchema.statements) {
        await dataSource.query(statement);
      }
    }

    await dataSource.query(
      `
        INSERT INTO terminal (
          id,
          public_id,
          nombre,
          codigo,
          activo
        )
        VALUES (
          1,
          'terminal-1',
          'Terminal 1',
          'terminal-1',
          1
        )
      `,
    );

    await dataSource.query(
      `
        INSERT INTO caja (
          id,
          public_id,
          id_terminal,
          apertura,
          cierre
        )
        VALUES
          (
            1,
            'caja-cerrada',
            1,
            '2026-09-20T08:00:00.000Z',
            '2026-09-20T20:00:00.000Z'
          ),
          (
            2,
            'caja-abierta',
            1,
            '2026-09-21T08:00:00.000Z',
            NULL
          )
      `,
    );

    repository = new TypeOrmCajaRepository(applicationDatabase);
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

  it('crea y actualiza una salida manteniendo el acumulado de caja', async (): Promise<void> => {
    const currentRepository: TypeOrmCajaRepository = requireRepository();

    const created = await currentRepository.createSalida({
      cajaPublicId: 'caja-abierta',
      concepto: 'Folios',
      descripcion: null,
      importeCents: 1_250,
    });

    expect(created.editable).toBe(true);

    expect(await getAggregate()).toBe(1_250);

    const updated = await currentRepository.updateSalida({
      publicId: created.publicId,
      cajaPublicId: 'caja-abierta',
      concepto: 'Material oficina',
      descripcion: 'Folios y bolígrafos',
      importeCents: 2_000,
    });

    expect(updated.fecha).toBe(created.fecha);
    expect(updated.importeCents).toBe(2_000);

    expect(await getAggregate()).toBe(2_000);
  });

  it('hace baja lógica y reconstruye el acumulado', async (): Promise<void> => {
    const currentRepository: TypeOrmCajaRepository = requireRepository();

    const first = await currentRepository.createSalida({
      cajaPublicId: 'caja-abierta',
      concepto: 'Primera',
      descripcion: null,
      importeCents: 1_000,
    });

    await currentRepository.createSalida({
      cajaPublicId: 'caja-abierta',
      concepto: 'Segunda',
      descripcion: null,
      importeCents: 500,
    });

    expect(await getAggregate()).toBe(1_500);

    await currentRepository.deleteSalida({
      publicId: first.publicId,
      cajaPublicId: 'caja-abierta',
    });

    expect(await getAggregate()).toBe(500);

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly MovimientoRow[] = (await dataSource.query(
      `
        SELECT
          concepto,
          importe_cents,
          descripcion,
          deleted_at
        FROM movimiento_caja
        WHERE public_id = ?
      `,
      [first.publicId],
    )) as readonly MovimientoRow[];

    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it('impide crear o modificar movimientos de una caja cerrada', async (): Promise<void> => {
    const currentRepository: TypeOrmCajaRepository = requireRepository();

    await expect(
      currentRepository.createSalida({
        cajaPublicId: 'caja-cerrada',
        concepto: 'No permitida',
        descripcion: null,
        importeCents: 1_000,
      }),
    ).rejects.toThrow('La caja indicada no está abierta.');

    const salida = await currentRepository.createSalida({
      cajaPublicId: 'caja-abierta',
      concepto: 'Salida válida',
      descripcion: null,
      importeCents: 1_000,
    });

    await expect(
      currentRepository.updateSalida({
        publicId: salida.publicId,
        cajaPublicId: 'caja-cerrada',
        concepto: 'No permitida',
        descripcion: null,
        importeCents: 2_000,
      }),
    ).rejects.toThrow('La caja indicada no está abierta.');
  });

  it('recalcula el cierre desde ventas, pagos y movimientos reales', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
      UPDATE caja
      SET
        importe_apertura_cents = 10000,
        movimientos_salida_cents = 99999,
        importe_cierre_teorico_cents = 88888
      WHERE public_id = 'caja-abierta'
    `,
    );

    await dataSource.query(
      `
      INSERT INTO empleado (
        id,
        public_id,
        nombre,
        password_hash,
        password_algorithm,
        color
      )
      VALUES (
        1,
        'empleado-1',
        'Empleado',
        'hash',
        'scrypt',
        '000000'
      )
    `,
    );

    await dataSource.query(
      `
      INSERT INTO tipo_pago (
        id,
        public_id,
        nombre,
        slug,
        afecta_caja,
        orden,
        fisico
      )
      VALUES
        (1, 'tipo-efectivo', 'Efectivo', 'efectivo', 1, 0, 1),
        (2, 'tipo-tarjeta', 'Tarjeta', 'tarjeta', 0, 1, 1),
        (3, 'tipo-vale', 'Vale efectivo', 'vale-efectivo', 1, 2, 1),
        (4, 'tipo-bizum', 'Bizum', 'bizum', 0, 3, 1)
    `,
    );

    await dataSource.query(
      `
      INSERT INTO caja_tipo (
        id_caja,
        id_tipo_pago,
        operaciones,
        importe_total_cents
      )
      VALUES
        (2, 1, 99, 99999),
        (2, 2, 99, 99999),
        (2, 3, 99, 99999),
        (2, 4, 99, 99999)
    `,
    );

    await dataSource.query(
      `
      INSERT INTO venta (
        id,
        public_id,
        id_caja,
        id_empleado,
        numero,
        total_cents,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES
        (
          1,
          'venta-1',
          2,
          1,
          1,
          10000,
          '2026-09-21T10:00:00.000Z',
          '2026-09-21T10:00:00.000Z',
          NULL
        ),
        (
          2,
          'venta-2',
          2,
          1,
          2,
          5000,
          '2026-09-21T11:00:00.000Z',
          '2026-09-21T11:00:00.000Z',
          NULL
        ),
        (
          3,
          'venta-3',
          2,
          1,
          3,
          -2000,
          '2026-09-21T12:00:00.000Z',
          '2026-09-21T12:00:00.000Z',
          NULL
        ),
        (
          4,
          'venta-borrada',
          2,
          1,
          4,
          1000,
          '2026-09-21T13:00:00.000Z',
          '2026-09-21T13:00:00.000Z',
          '2026-09-21T13:05:00.000Z'
        )
    `,
    );

    await dataSource.query(
      `
      INSERT INTO venta_pago (
        public_id,
        id_venta,
        id_tipo_pago,
        orden,
        importe_cents
      )
      VALUES
        ('pago-1-efectivo', 1, 1, 0, 4000),
        ('pago-1-tarjeta', 1, 2, 1, 6000),
        ('pago-2-vale', 2, 3, 0, 5000),
        ('pago-3-efectivo', 3, 1, 0, -2000),
        ('pago-borrado', 4, 1, 0, 1000)
    `,
    );

    await dataSource.query(
      `
      INSERT INTO movimiento_caja (
        public_id,
        id_caja,
        tipo,
        concepto,
        importe_cents,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES
        (
          'salida-activa',
          2,
          'salida',
          'Material',
          1500,
          '2026-09-21T14:00:00.000Z',
          '2026-09-21T14:00:00.000Z',
          NULL
        ),
        (
          'salida-borrada',
          2,
          'salida',
          'No contar',
          999,
          '2026-09-21T14:10:00.000Z',
          '2026-09-21T14:10:00.000Z',
          '2026-09-21T14:20:00.000Z'
        )
    `,
    );

    const result = await requireRepository().findCierre('caja-abierta');

    expect(result).toEqual({
      cajaPublicId: 'caja-abierta',
      apertura: '2026-09-21T08:00:00.000Z',
      importeAperturaCents: 10_000,

      /*
       * Efectivo:
       *   4000 - 2000 = 2000
       *
       * Vale con afecta_caja:
       *   5000
       *
       * Total:
       *   7000
       */
      ventasAfectanCajaCents: 7_000,

      salidasCajaCents: 1_500,

      tiposPago: [
        {
          publicId: 'tipo-efectivo',
          nombre: 'Efectivo',
          slug: 'efectivo',
          afectaCaja: true,
          orden: 0,
          operaciones: 2,
          importeVentasCents: 2_000,
        },
        {
          publicId: 'tipo-tarjeta',
          nombre: 'Tarjeta',
          slug: 'tarjeta',
          afectaCaja: false,
          orden: 1,
          operaciones: 1,
          importeVentasCents: 6_000,
        },
        {
          publicId: 'tipo-vale',
          nombre: 'Vale efectivo',
          slug: 'vale-efectivo',
          afectaCaja: true,
          orden: 2,
          operaciones: 1,
          importeVentasCents: 5_000,
        },
        {
          publicId: 'tipo-bizum',
          nombre: 'Bizum',
          slug: 'bizum',
          afectaCaja: false,
          orden: 3,
          operaciones: 0,
          importeVentasCents: 0,
        },
      ],
    });
  });

  it('no devuelve datos de cierre para una caja ya cerrada', async (): Promise<void> => {
    await expect(requireRepository().findCierre('caja-cerrada')).resolves.toBeNull();
  });
});

function requireRepository(): TypeOrmCajaRepository {
  if (repository === null) {
    throw new Error('El repository de prueba no está inicializado.');
  }

  return repository;
}

function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de prueba no está inicializada.');
  }

  return applicationDatabase;
}

async function getAggregate(): Promise<number> {
  const dataSource: DataSource = await requireDatabase().connect();

  const rows: readonly CajaAggregateRow[] = (await dataSource.query(
    `
      SELECT
        movimientos_salida_cents
      FROM caja
      WHERE public_id = 'caja-abierta'
    `,
  )) as readonly CajaAggregateRow[];

  return rows[0]?.movimientos_salida_cents ?? 0;
}
