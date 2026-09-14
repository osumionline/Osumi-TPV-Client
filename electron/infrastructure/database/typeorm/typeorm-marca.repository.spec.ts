import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmMarcaRepository from '@infrastructure/database/typeorm/typeorm-marca.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmMarcaRepository | null = null;

describe('TypeOrmMarcaRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-marcas-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'marcas.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedMarcas(dataSource);

    repository = new TypeOrmMarcaRepository(applicationDatabase);
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

  it('devuelve únicamente las marcas activas ordenadas por nombre', async (): Promise<void> => {
    const marcas: readonly MarcaRecord[] = await requireRepository().findAll();

    expect(marcas.map((marca: MarcaRecord): string => marca.nombre)).toEqual([
      'Marca A',
      'Marca B',
    ]);

    expect(marcas[1]).toEqual({
      id: 1,
      publicId: 'marca-b',
      nombre: 'Marca B',
      direccion: 'Dirección original',
      fotoRelativePath: 'files/brands/marca-b.webp',
      telefono: '944000001',
      email: 'marca-b@example.com',
      web: 'https://marca-b.example.com',
      observaciones: 'Observaciones originales',
    });
  });

  it('recupera una marca activa por id y oculta las dadas de baja', async (): Promise<void> => {
    expect(await requireRepository().findById(1)).toMatchObject({
      id: 1,
      publicId: 'marca-b',
      nombre: 'Marca B',
    });

    expect(await requireRepository().findById(2)).toBeNull();
    expect(await requireRepository().findById(999)).toBeNull();
  });

  it('detecta nombres ya utilizados por otras marcas activas', async (): Promise<void> => {
    const currentRepository: TypeOrmMarcaRepository = requireRepository();

    expect(await currentRepository.existsActiveByName('Marca B', null)).toBe(true);
    expect(await currentRepository.existsActiveByName('marca b', null)).toBe(true);

    expect(await currentRepository.existsActiveByName('Marca B', 1)).toBe(false);

    expect(await currentRepository.existsActiveByName('Marca inexistente', null)).toBe(false);
  });

  it('crea una marca sin crear proveedor cuando no se solicita', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const providersBefore: readonly {
      readonly total: number;
    }[] = await dataSource.query(`
      SELECT COUNT(*) AS total
      FROM proveedor
    `);

    const marca: MarcaRecord = await requireRepository().create(
      createCommand({
        nombre: 'Marca nueva',
      }),
    );

    expect(marca).toMatchObject({
      nombre: 'Marca nueva',
      direccion: 'Nueva dirección',
      fotoRelativePath: null,
      telefono: '944000010',
      email: 'nueva@example.com',
      web: 'https://nueva.example.com',
      observaciones: 'Nueva observación',
    });

    expect(marca.publicId).not.toBe('');

    const providersAfter: readonly {
      readonly total: number;
    }[] = await dataSource.query(`
      SELECT COUNT(*) AS total
      FROM proveedor
    `);

    expect(providersAfter[0]?.total).toBe(providersBefore[0]?.total);
  });

  it('mantiene la creación rápida de proveedor asociada al alta de Marca', async (): Promise<void> => {
    const marca: MarcaRecord = await requireRepository().create(
      createCommand({
        nombre: 'Marca con proveedor',
        crearProveedor: true,
      }),
    );

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly nombre: string;
      readonly id_marca: number;
    }[] = await dataSource.query(
      `
        SELECT
          p.nombre,
          pm.id_marca
        FROM proveedor p

        INNER JOIN proveedor_marca pm
          ON pm.id_proveedor = p.id

        WHERE pm.id_marca = ?
      `,
      [marca.id],
    );

    expect(rows).toEqual([
      {
        nombre: 'Marca con proveedor',
        id_marca: marca.id,
      },
    ]);
  });

  it('actualiza únicamente los datos editables y conserva el logo', async (): Promise<void> => {
    const marca: MarcaRecord = await requireRepository().update(1, updateCommand());

    expect(marca).toEqual({
      id: 1,
      publicId: 'marca-b',
      nombre: 'Marca B actualizada',
      direccion: 'Dirección actualizada',
      fotoRelativePath: 'files/brands/marca-b.webp',
      telefono: '944999999',
      email: 'actualizada@example.com',
      web: 'https://actualizada.example.com',
      observaciones: 'Observaciones actualizadas',
    });

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(
      `
        SELECT id_archivo
        FROM marca
        WHERE id = 1
      `,
    );

    expect(rows[0]?.id_archivo).toBe(1);
  });

  it('no permite actualizar una marca inexistente o dada de baja', async (): Promise<void> => {
    const currentRepository: TypeOrmMarcaRepository = requireRepository();

    await expect(currentRepository.update(999, updateCommand())).rejects.toThrow(
      'La marca que se intenta actualizar no existe.',
    );

    await expect(currentRepository.update(2, updateCommand())).rejects.toThrow(
      'La marca que se intenta actualizar no existe.',
    );
  });

  it('da de baja una marca sin alterar artículos, proveedores ni logo', async (): Promise<void> => {
    await requireRepository().deactivate(1);

    expect(await requireRepository().findById(1)).toBeNull();

    const dataSource: DataSource = await requireDatabase().connect();

    const brandRows: readonly {
      readonly id_archivo: number | null;
      readonly deleted_at: string | null;
    }[] = await dataSource.query(
      `
        SELECT
          id_archivo,
          deleted_at
        FROM marca
        WHERE id = 1
      `,
    );

    expect(brandRows[0]?.id_archivo).toBe(1);
    expect(brandRows[0]?.deleted_at).not.toBeNull();

    const articleRows: readonly {
      readonly id_marca: number;
      readonly deleted_at: string | null;
    }[] = await dataSource.query(
      `
        SELECT
          id_marca,
          deleted_at
        FROM articulo
        WHERE id = 1
      `,
    );

    expect(articleRows).toEqual([
      {
        id_marca: 1,
        deleted_at: null,
      },
    ]);

    const relationRows: readonly {
      readonly total: number;
    }[] = await dataSource.query(`
      SELECT COUNT(*) AS total
      FROM proveedor_marca
      WHERE
        id_proveedor = 1
        AND id_marca = 1
    `);

    expect(relationRows[0]?.total).toBe(1);

    const fileRows: readonly {
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
      SELECT deleted_at
      FROM archivo
      WHERE id = 1
    `);

    expect(fileRows).toEqual([
      {
        deleted_at: null,
      },
    ]);
  });

  it('no permite dar de baja una marca que no está activa', async (): Promise<void> => {
    const currentRepository: TypeOrmMarcaRepository = requireRepository();

    await currentRepository.deactivate(1);

    await expect(currentRepository.deactivate(1)).rejects.toThrow(
      'La marca que se intenta eliminar no existe o ya está dada de baja.',
    );

    await expect(currentRepository.deactivate(999)).rejects.toThrow(
      'La marca que se intenta eliminar no existe o ya está dada de baja.',
    );
  });

  it('crea una marca enlazando su nuevo logo en la misma persistencia', async (): Promise<void> => {
    const marca: MarcaRecord = await requireRepository().create(
      createCommand({
        nombre: 'Marca con logo',
        nuevoLogo: createBrandLogo(),
      }),
    );

    expect(marca.fotoRelativePath).toBe('files/brands/brand-logo-new.webp');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly purpose: string;
      readonly relative_path: string;
    }[] = await dataSource.query(
      `
      SELECT
        a.purpose,
        a.relative_path
      FROM marca m

      INNER JOIN archivo a
        ON a.id = m.id_archivo

      WHERE m.id = ?
    `,
      [marca.id],
    );

    expect(rows).toEqual([
      {
        purpose: 'brand_image',
        relative_path: 'files/brands/brand-logo-new.webp',
      },
    ]);
  });

  it('permite quitar el logo sin eliminar su archivo persistido', async (): Promise<void> => {
    const marca: MarcaRecord = await requireRepository().update(
      1,
      updateCommand({
        logo: {
          action: 'remove',
        },
      }),
    );

    expect(marca.fotoRelativePath).toBeNull();

    const dataSource: DataSource = await requireDatabase().connect();

    const brandRows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(`
    SELECT id_archivo
    FROM marca
    WHERE id = 1
  `);

    expect(brandRows[0]?.id_archivo).toBeNull();

    const fileRows: readonly {
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
    SELECT deleted_at
    FROM archivo
    WHERE id = 1
  `);

    expect(fileRows).toEqual([
      {
        deleted_at: null,
      },
    ]);
  });

  it('sustituye el logo conservando intacto el archivo anterior', async (): Promise<void> => {
    const marca: MarcaRecord = await requireRepository().update(
      1,
      updateCommand({
        logo: {
          action: 'replace',
          nuevoArchivo: createBrandLogo(),
        },
      }),
    );

    expect(marca.fotoRelativePath).toBe('files/brands/brand-logo-new.webp');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly id_archivo: number | null;
      readonly relative_path: string | null;
    }[] = await dataSource.query(`
    SELECT
      m.id_archivo,
      a.relative_path
    FROM marca m

    LEFT JOIN archivo a
      ON a.id = m.id_archivo

    WHERE m.id = 1
  `);

    expect(rows[0]?.id_archivo).not.toBe(1);
    expect(rows[0]?.relative_path).toBe('files/brands/brand-logo-new.webp');

    const previousRows: readonly {
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
    SELECT deleted_at
    FROM archivo
    WHERE id = 1
  `);

    expect(previousRows).toEqual([
      {
        deleted_at: null,
      },
    ]);
  });

  it('rechaza un archivo que no sea un logo WebP preparado para Marcas', async (): Promise<void> => {
    await expect(
      requireRepository().update(
        1,
        updateCommand({
          logo: {
            action: 'replace',
            nuevoArchivo: createBrandLogo({
              purpose: 'article_image',
            }),
          },
        }),
      ),
    ).rejects.toThrow('El logo nuevo no pertenece al almacenamiento de imágenes de Marcas.');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(`
    SELECT id_archivo
    FROM marca
    WHERE id = 1
  `);

    expect(rows[0]?.id_archivo).toBe(1);
  });
});

/**
 * Construye un comando de alta de Marca para los tests.
 */
function createCommand(overrides: Partial<CrearMarcaRecordCommand> = {}): CrearMarcaRecordCommand {
  return {
    nombre: 'Marca nueva',
    telefono: '944000010',
    email: 'nueva@example.com',
    direccion: 'Nueva dirección',
    web: 'https://nueva.example.com',
    observaciones: 'Nueva observación',
    crearProveedor: false,
    nuevoLogo: null,
    ...overrides,
  };
}

/**
 * Construye un comando de actualización de Marca.
 */
function updateCommand(
  overrides: Partial<ActualizarMarcaRecordCommand> = {},
): ActualizarMarcaRecordCommand {
  return {
    nombre: 'Marca B actualizada',
    telefono: '944999999',
    email: 'actualizada@example.com',
    direccion: 'Dirección actualizada',
    web: 'https://actualizada.example.com',
    observaciones: 'Observaciones actualizadas',
    logo: {
      action: 'keep',
    },
    ...overrides,
  };
}

/**
 * Construye los metadatos de un logo WebP preparado.
 */
function createBrandLogo(overrides: Partial<ArchivoCreateRecord> = {}): ArchivoCreateRecord {
  return {
    publicId: 'brand-logo-new',
    purpose: 'brand_image',
    originalName: 'brand-logo.png',
    internalName: 'brand-logo-new.webp',
    relativePath: 'files/brands/brand-logo-new.webp',
    mimeType: 'image/webp',
    sizeBytes: 4321,
    sha256: 'b'.repeat(64),
    width: 900,
    height: 600,
    ...overrides,
  };
}

/**
 * Crea todas las tablas de la aplicación en la SQLite temporal.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta marcas y relaciones representativas para los tests.
 */
async function seedMarcas(dataSource: DataSource): Promise<void> {
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
        'marca-b-file',
        'brand_image',
        'marca-b.png',
        'marca-b.webp',
        'files/brands/marca-b.webp',
        'image/webp',
        1234,
        ?,
        800,
        600
      )
    `,
    ['a'.repeat(64)],
  );

  await dataSource.query(`
    INSERT INTO marca (
      id,
      public_id,
      id_archivo,
      nombre,
      direccion,
      telefono,
      email,
      web,
      observaciones,
      deleted_at
    )
    VALUES
      (
        1,
        'marca-b',
        1,
        'Marca B',
        'Dirección original',
        '944000001',
        'marca-b@example.com',
        'https://marca-b.example.com',
        'Observaciones originales',
        NULL
      ),
      (
        2,
        'marca-eliminada',
        NULL,
        'Marca eliminada',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        CURRENT_TIMESTAMP
      ),
      (
        3,
        'marca-a',
        NULL,
        'Marca A',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      )
  `);

  await dataSource.query(`
    INSERT INTO proveedor (
      id,
      public_id,
      nombre
    )
    VALUES (
      1,
      'proveedor-1',
      'Proveedor relacionado'
    )
  `);

  await dataSource.query(`
    INSERT INTO proveedor_marca (
      id_proveedor,
      id_marca
    )
    VALUES (
      1,
      1
    )
  `);

  await dataSource.query(`
    INSERT INTO articulo (
      id,
      public_id,
      localizador,
      nombre,
      slug,
      id_marca,
      id_proveedor,
      referencia,
      palb_micros,
      puc_micros,
      pvp_cents,
      pvp_descuento_cents,
      iva_bps,
      re_bps,
      margen_microporcentaje,
      margen_descuento_microporcentaje,
      stock,
      stock_min,
      stock_max,
      lote_optimo,
      venta_online,
      mostrar_en_web,
      descripcion_corta,
      descripcion,
      observaciones,
      mostrar_observaciones_pedidos,
      mostrar_observaciones_ventas,
      acceso_directo
    )
    VALUES (
      1,
      'articulo-1',
      261234,
      'Artículo relacionado',
      'articulo relacionado',
      1,
      1,
      'REF-1',
      590000,
      744580,
      100,
      NULL,
      2100,
      520,
      255420,
      NULL,
      8,
      2,
      20,
      5,
      1,
      0,
      NULL,
      NULL,
      NULL,
      0,
      0,
      NULL
    )
  `);
}

/**
 * Devuelve el repository inicializado.
 */
function requireRepository(): TypeOrmMarcaRepository {
  if (repository === null) {
    throw new Error('El repository de Marcas no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la base temporal inicializada.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de Marcas no está inicializada.');
  }

  return applicationDatabase;
}
