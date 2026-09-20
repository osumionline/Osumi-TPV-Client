import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type { TipoPagoEstadisticasRepositoryResult } from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmTipoPagoRepository from '@infrastructure/database/typeorm/typeorm-tipo-pago.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmTipoPagoRepository | null = null;

describe('TypeOrmTipoPagoRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-tipos-pago-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'tipos-pago.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);

    await seedTiposPago(dataSource);

    repository = new TypeOrmTipoPagoRepository(applicationDatabase);
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

  it('recupera tipos activos y permite buscarlos por id', async (): Promise<void> => {
    const tiposPago: readonly TipoPagoRecord[] = await requireRepository().findAll();

    expect(tiposPago.map((tipoPago: TipoPagoRecord): string => tipoPago.slug)).toEqual([
      'efectivo',
      'visa',
    ]);

    await expect(requireRepository().findById(2)).resolves.toMatchObject({
      id: 2,
      slug: 'visa',
      fotoRelativePath: 'files/payment-types/visa.webp',
    });

    await expect(requireRepository().findById(3)).resolves.toBeNull();
  });

  it('detecta slugs activos ignorando mayúsculas', async (): Promise<void> => {
    const currentRepository: TypeOrmTipoPagoRepository = requireRepository();

    expect(await currentRepository.existsActiveBySlug('VISA', null)).toBe(true);

    expect(await currentRepository.existsActiveBySlug('visa', 2)).toBe(false);

    expect(await currentRepository.existsActiveBySlug('bizum', null)).toBe(false);
  });

  it('crea un tipo de pago al final del orden y enlaza su logo', async (): Promise<void> => {
    const tipoPago: TipoPagoRecord = await requireRepository().create(createCommand());

    expect(tipoPago).toMatchObject({
      nombre: 'Bizum',
      slug: 'bizum',
      fotoRelativePath: 'files/payment-types/bizum.webp',
      afectaCaja: false,
      orden: 2,
      fisico: true,
    });

    expect(tipoPago.publicId).not.toBe('');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly purpose: string;
      readonly relative_path: string;
    }[] = await dataSource.query(
      `
              SELECT
                a.purpose,
                a.relative_path
              FROM tipo_pago tp

              INNER JOIN archivo a
                ON a.id =
                  tp.id_archivo

              WHERE
                tp.id = ?
            `,
      [tipoPago.id],
    );

    expect(rows).toEqual([
      {
        purpose: 'payment_type_icon',
        relative_path: 'files/payment-types/bizum.webp',
      },
    ]);
  });

  it('actualiza los datos conservando orden y logo cuando no hay sustitución', async (): Promise<void> => {
    const tipoPago: TipoPagoRecord = await requireRepository().update(2, updateCommand());

    expect(tipoPago).toEqual({
      id: 2,
      publicId: 'tipo-pago-visa',
      nombre: 'Tarjeta',
      slug: 'tarjeta',
      fotoRelativePath: 'files/payment-types/visa.webp',
      afectaCaja: true,
      orden: 1,
      fisico: false,
    });
  });

  it('sustituye el logo conservando el archivo anterior', async (): Promise<void> => {
    const tipoPago: TipoPagoRecord = await requireRepository().update(
      2,
      updateCommand({
        nuevoLogo: createPaymentTypeLogo({
          publicId: 'tarjeta-file',
          internalName: 'tarjeta.webp',
          relativePath: 'files/payment-types/tarjeta.webp',
        }),
      }),
    );

    expect(tipoPago.fotoRelativePath).toBe('files/payment-types/tarjeta.webp');

    const dataSource: DataSource = await requireDatabase().connect();

    const previousRows: readonly {
      readonly deleted_at: string | null;
    }[] = await dataSource.query(
      `
              SELECT
                deleted_at
              FROM archivo
              WHERE id = 1
            `,
    );

    expect(previousRows).toEqual([
      {
        deleted_at: null,
      },
    ]);
  });

  it('rechaza archivos que no pertenezcan a Tipos de pago', async (): Promise<void> => {
    await expect(
      requireRepository().create(
        createCommand({
          nuevoLogo: createPaymentTypeLogo({
            purpose: 'brand_image',
          }),
        }),
      ),
    ).rejects.toThrow('El logo nuevo no pertenece al almacenamiento de imágenes de Tipos de pago.');
  });

  it('reordena atómicamente los tipos configurables manteniendo Efectivo en orden cero', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
      INSERT INTO tipo_pago (
        id,
        public_id,
        id_archivo,
        nombre,
        slug,
        afecta_caja,
        orden,
        fisico,
        activo,
        deleted_at
      )
      VALUES (
        4,
        'tipo-pago-bizum',
        NULL,
        'Bizum',
        'bizum',
        0,
        2,
        1,
        1,
        NULL
      )
    `,
    );

    const tiposPago: readonly TipoPagoRecord[] = await requireRepository().reorder([4, 2]);

    expect(
      tiposPago.map((tipoPago: TipoPagoRecord) => ({
        id: tipoPago.id,
        orden: tipoPago.orden,
      })),
    ).toEqual([
      {
        id: 1,
        orden: 0,
      },
      {
        id: 4,
        orden: 1,
      },
      {
        id: 2,
        orden: 2,
      },
    ]);
  });

  it('rechaza un reorder que no contenga exactamente todos los tipos configurables activos', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
      INSERT INTO tipo_pago (
        id,
        public_id,
        id_archivo,
        nombre,
        slug,
        afecta_caja,
        orden,
        fisico,
        activo,
        deleted_at
      )
      VALUES (
        4,
        'tipo-pago-bizum',
        NULL,
        'Bizum',
        'bizum',
        0,
        2,
        1,
        1,
        NULL
      )
    `,
    );

    await expect(requireRepository().reorder([2])).rejects.toThrow(
      'El orden recibido no coincide con los tipos de pago configurables activos.',
    );

    await expect(requireRepository().reorder([1, 2])).rejects.toThrow(
      'El orden recibido no coincide con los tipos de pago configurables activos.',
    );

    const tiposPago: readonly TipoPagoRecord[] = await requireRepository().findAll();

    expect(
      tiposPago.map((tipoPago: TipoPagoRecord) => ({
        id: tipoPago.id,
        orden: tipoPago.orden,
      })),
    ).toEqual([
      {
        id: 1,
        orden: 0,
      },
      {
        id: 2,
        orden: 1,
      },
      {
        id: 4,
        orden: 2,
      },
    ]);
  });

  it('da de baja lógicamente conservando registro y logo', async (): Promise<void> => {
    await requireRepository().deactivate(2);

    await expect(requireRepository().findById(2)).resolves.toBeNull();

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly activo: number;
      readonly id_archivo: number | null;
      readonly deleted_at: string | null;
    }[] = await dataSource.query(
      `
              SELECT
                activo,
                id_archivo,
                deleted_at
              FROM tipo_pago
              WHERE id = 2
            `,
    );

    expect(rows[0]?.activo).toBe(0);

    expect(rows[0]?.id_archivo).toBe(1);

    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it('no actualiza ni elimina tipos de pago inactivos', async (): Promise<void> => {
    const currentRepository: TypeOrmTipoPagoRepository = requireRepository();

    await expect(currentRepository.update(3, updateCommand())).rejects.toThrow(
      'El tipo de pago que se intenta actualizar no existe.',
    );

    await expect(currentRepository.deactivate(3)).rejects.toThrow(
      'El tipo de pago que se intenta eliminar no existe o ya está dado de baja.',
    );
  });

  it('agrega las estadísticas históricas del tipo de pago y excluye ventas eliminadas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await seedTipoPagoStatistics(dataSource);

    const result: TipoPagoEstadisticasRepositoryResult = await requireRepository().findEstadisticas(
      {
        idTipoPago: 2,
        year: 2026,
        month: 9,
      },
    );

    expect(result.years).toEqual([2025, 2026]);

    expect(result.items).toEqual([
      {
        year: 2026,
        month: 9,
        day: 1,
        importeCents: 1_500,
      },
      {
        year: 2026,
        month: 9,
        day: 2,
        importeCents: -500,
      },
    ]);

    expect(result.totalImporteCents).toBe(1_000);

    /*
     * El día 1 tiene dos líneas VISA
     * dentro de la misma venta.
     */
    expect(result.operaciones).toBe(2);

    expect(result.totalGlobalCents).toBe(1_500);
  });
});

function createCommand(
  overrides: Partial<CrearTipoPagoRecordCommand> = {},
): CrearTipoPagoRecordCommand {
  return {
    nombre: 'Bizum',
    slug: 'bizum',
    afectaCaja: false,
    fisico: true,
    nuevoLogo: createPaymentTypeLogo(),
    ...overrides,
  };
}

function updateCommand(
  overrides: Partial<ActualizarTipoPagoRecordCommand> = {},
): ActualizarTipoPagoRecordCommand {
  return {
    nombre: 'Tarjeta',
    slug: 'tarjeta',
    afectaCaja: true,
    fisico: false,
    nuevoLogo: null,
    ...overrides,
  };
}

function createPaymentTypeLogo(overrides: Partial<ArchivoCreateRecord> = {}): ArchivoCreateRecord {
  return {
    publicId: 'bizum-file',
    purpose: 'payment_type_icon',
    originalName: 'bizum.png',
    internalName: 'bizum.webp',
    relativePath: 'files/payment-types/bizum.webp',
    mimeType: 'image/webp',
    sizeBytes: 2048,
    sha256: 'b'.repeat(64),
    width: 256,
    height: 256,
    ...overrides,
  };
}

async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

async function seedTiposPago(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO archivo (
        id,
        public_id,
        purpose,
        original_name,
        internal_name,
        relative_path,
        mime_type,
        size_bytes,
        sha256,
        width,
        height
      )
      VALUES (
        1,
        'visa-file',
        'payment_type_icon',
        'visa.png',
        'visa.webp',
        'files/payment-types/visa.webp',
        'image/webp',
        1024,
        ?,
        256,
        256
      )
    `,
    ['a'.repeat(64)],
  );

  await dataSource.query(
    `
      INSERT INTO tipo_pago (
        id,
        public_id,
        id_archivo,
        nombre,
        slug,
        afecta_caja,
        orden,
        fisico,
        activo,
        deleted_at
      )
      VALUES
        (
          1,
          'tipo-pago-efectivo',
          NULL,
          'Efectivo',
          'efectivo',
          1,
          0,
          1,
          1,
          NULL
        ),
        (
          2,
          'tipo-pago-visa',
          1,
          'VISA',
          'visa',
          0,
          1,
          1,
          1,
          NULL
        ),
        (
          3,
          'tipo-pago-eliminado',
          NULL,
          'Eliminado',
          'eliminado',
          0,
          9,
          1,
          0,
          '2026-09-01T00:00:00.000Z'
        )
    `,
  );
}

/**
 * Inserta ventas suficientes para comprobar
 * agregados, pagos mixtos, devoluciones y bajas.
 */
async function seedTipoPagoStatistics(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      id,
      public_id,
      nombre,
      codigo
    )
    VALUES (
      1,
      'terminal-payment-stats',
      'Terminal estadísticas',
      'PAY-STATS'
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
      'empleado-payment-stats',
      'Empleado estadísticas',
      'hash-test',
      'scrypt',
      'FFFFFF',
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
      'caja-payment-stats',
      1,
      1,
      '2025-01-01T08:00:00.000Z'
    )
  `);

  await dataSource.query(`
    INSERT INTO venta (
      id,
      public_id,
      id_caja,
      id_empleado,
      numero,
      total_cents,
      created_at,
      deleted_at
    )
    VALUES
      (
        1,
        'payment-sale-2025',
        1,
        1,
        1,
        1000,
        '2025-12-15T10:00:00.000Z',
        NULL
      ),
      (
        2,
        'payment-sale-mixed',
        1,
        1,
        2,
        2000,
        '2026-09-01T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'payment-sale-return',
        1,
        1,
        3,
        -500,
        '2026-09-02T10:00:00.000Z',
        NULL
      ),
      (
        4,
        'payment-sale-october',
        1,
        1,
        4,
        300,
        '2026-10-01T10:00:00.000Z',
        NULL
      ),
      (
        5,
        'payment-sale-deleted',
        1,
        1,
        5,
        9999,
        '2026-09-03T10:00:00.000Z',
        '2026-09-03T11:00:00.000Z'
      )
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
      (
        1,
        'payment-2025-visa',
        1,
        2,
        0,
        600
      ),
      (
        2,
        'payment-2025-cash',
        1,
        1,
        1,
        400
      ),
      (
        3,
        'payment-mixed-visa-1',
        2,
        2,
        0,
        1000
      ),
      (
        4,
        'payment-mixed-visa-2',
        2,
        2,
        1,
        500
      ),
      (
        5,
        'payment-mixed-cash',
        2,
        1,
        2,
        500
      ),
      (
        6,
        'payment-return-visa',
        3,
        2,
        0,
        -500
      ),
      (
        7,
        'payment-october-visa',
        4,
        2,
        0,
        300
      ),
      (
        8,
        'payment-deleted-visa',
        5,
        2,
        0,
        9999
      )
  `);
}

function requireRepository(): TypeOrmTipoPagoRepository {
  if (repository === null) {
    throw new Error('El repository de Tipos de pago no está inicializado.');
  }

  return repository;
}

function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de Tipos de pago no está inicializada.');
  }

  return applicationDatabase;
}
