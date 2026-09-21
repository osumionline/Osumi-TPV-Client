import coreDatabaseSchema from '@infrastructure/database/schema/core.database-schema';
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

    for (const statement of coreDatabaseSchema.statements) {
      await dataSource.query(statement);
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
