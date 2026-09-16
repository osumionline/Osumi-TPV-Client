import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmProveedorRepository from '@infrastructure/database/typeorm/typeorm-proveedor.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmProveedorRepository | null = null;

describe('TypeOrmProveedorRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-proveedores-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'proveedores.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedProveedores(dataSource);

    repository = new TypeOrmProveedorRepository(applicationDatabase);
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

  it('devuelve únicamente proveedores activos ocultando marcas y comerciales dados de baja', async (): Promise<void> => {
    const proveedores: readonly ProveedorRecord[] = await requireRepository().findAll();

    expect(proveedores).toHaveLength(1);
    expect(proveedores[0]).toEqual({
      id: 1,
      publicId: 'proveedor-b',
      nombre: 'Proveedor B',
      fotoRelativePath: 'files/providers/proveedor-b.webp',
      direccion: 'Dirección original',
      telefono: '944000001',
      email: 'proveedor-b@example.com',
      web: 'https://proveedor-b.example.com',
      observaciones: 'Observaciones originales',
      marcas: [1],
      comerciales: [
        {
          id: 1,
          publicId: 'comercial-activo',
          idProveedor: 1,
          nombre: 'Comercial activo',
          telefono: '600000001',
          email: 'comercial@example.com',
          observaciones: 'Comercial principal',
        },
      ],
    });
  });

  it('recupera un proveedor activo por id y oculta los dados de baja', async (): Promise<void> => {
    await expect(requireRepository().findById(1)).resolves.toMatchObject({
      id: 1,
      publicId: 'proveedor-b',
      nombre: 'Proveedor B',
      marcas: [1],
    });

    await expect(requireRepository().findById(2)).resolves.toBeNull();
    await expect(requireRepository().findById(999)).resolves.toBeNull();
  });

  it('detecta nombres de proveedores activos ignorando mayúsculas y permite excluir el actual', async (): Promise<void> => {
    const currentRepository: TypeOrmProveedorRepository = requireRepository();

    expect(await currentRepository.existsActiveByName('Proveedor B', null)).toBe(true);
    expect(await currentRepository.existsActiveByName('proveedor b', null)).toBe(true);
    expect(await currentRepository.existsActiveByName('PROVEEDOR B', 1)).toBe(false);
    expect(await currentRepository.existsActiveByName('Proveedor eliminado', null)).toBe(false);
    expect(await currentRepository.existsActiveByName('Proveedor inexistente', null)).toBe(false);
  });

  it('crea un proveedor con sus relaciones activas con marcas', async (): Promise<void> => {
    const proveedor: ProveedorRecord = await requireRepository().create(
      createCommand({
        idsMarcas: [2],
      }),
    );

    expect(proveedor).toMatchObject({
      nombre: 'Proveedor nuevo',
      fotoRelativePath: null,
      direccion: 'Nueva dirección',
      telefono: '944000010',
      email: 'nuevo@example.com',
      web: 'https://nuevo.example.com',
      observaciones: 'Nueva observación',
      marcas: [2],
      comerciales: [],
    });
    expect(proveedor.publicId).not.toBe('');

    const dataSource: DataSource = await requireDatabase().connect();

    const relationRows: readonly {
      readonly id_marca: number;
    }[] = await dataSource.query(
      `
              SELECT id_marca
              FROM proveedor_marca
              WHERE id_proveedor = ?
            `,
      [proveedor.id],
    );

    expect(relationRows).toEqual([
      {
        id_marca: 2,
      },
    ]);
  });

  it('rechaza al crear una relación con una marca no activa sin persistir el proveedor', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const beforeRows: readonly {
      readonly total: number;
    }[] = await dataSource.query(`
            SELECT
              COUNT(*) AS total
            FROM proveedor
          `);

    await expect(
      requireRepository().create(
        createCommand({
          idsMarcas: [3],
        }),
      ),
    ).rejects.toThrow('Una de las marcas seleccionadas no existe.');

    const afterRows: readonly {
      readonly total: number;
    }[] = await dataSource.query(`
            SELECT
              COUNT(*) AS total
            FROM proveedor
          `);

    expect(afterRows[0]?.total).toBe(beforeRows[0]?.total);
  });

  it('actualiza el proveedor sincronizando solo relaciones con marcas activas', async (): Promise<void> => {
    const proveedor: ProveedorRecord = await requireRepository().update(
      1,
      updateCommand({
        idsMarcas: [2],
      }),
    );

    expect(proveedor).toEqual({
      id: 1,
      publicId: 'proveedor-b',
      nombre: 'Proveedor B actualizado',
      fotoRelativePath: 'files/providers/proveedor-b.webp',
      direccion: 'Dirección actualizada',
      telefono: '944999999',
      email: 'actualizado@example.com',
      web: 'https://actualizado.example.com',
      observaciones: 'Observaciones actualizadas',
      marcas: [2],
      comerciales: [
        {
          id: 1,
          publicId: 'comercial-activo',
          idProveedor: 1,
          nombre: 'Comercial activo',
          telefono: '600000001',
          email: 'comercial@example.com',
          observaciones: 'Comercial principal',
        },
      ],
    });

    const dataSource: DataSource = await requireDatabase().connect();

    const providerRows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(`
            SELECT
              id_archivo
            FROM proveedor
            WHERE id = 1
          `);

    /*
     * La edición del proveedor
     * no toca su archivo.
     */
    expect(providerRows[0]?.id_archivo).toBe(1);

    const relationRows: readonly {
      readonly id_marca: number;
    }[] = await dataSource.query(`
            SELECT
              id_marca
            FROM proveedor_marca
            WHERE id_proveedor = 1
            ORDER BY id_marca
          `);

    /*
     * Marca 1 era activa y se ha
     * desmarcado: desaparece.
     *
     * Marca 2 es la nueva activa:
     * se añade.
     *
     * Marca 3 estaba relacionada
     * pero fue dada de baja:
     * permanece físicamente oculta.
     */
    expect(relationRows).toEqual([
      {
        id_marca: 2,
      },
      {
        id_marca: 3,
      },
    ]);
  });

  it('revierte toda la actualización si una marca seleccionada ya no está activa', async (): Promise<void> => {
    const currentRepository: TypeOrmProveedorRepository = requireRepository();

    await expect(
      currentRepository.update(
        1,
        updateCommand({
          nombre: 'Este nombre no debe persistirse',
          idsMarcas: [2, 3],
        }),
      ),
    ).rejects.toThrow('Una de las marcas seleccionadas no existe.');

    const proveedor: ProveedorRecord | null = await currentRepository.findById(1);

    expect(proveedor).toMatchObject({
      nombre: 'Proveedor B',
      direccion: 'Dirección original',
      marcas: [1],
    });

    const dataSource: DataSource = await requireDatabase().connect();

    const relationRows: readonly {
      readonly id_marca: number;
    }[] = await dataSource.query(`
            SELECT
              id_marca
            FROM proveedor_marca
            WHERE id_proveedor = 1
            ORDER BY id_marca
          `);

    expect(relationRows).toEqual([
      {
        id_marca: 1,
      },
      {
        id_marca: 3,
      },
    ]);
  });

  it('no permite actualizar un proveedor inexistente o dado de baja', async (): Promise<void> => {
    const currentRepository: TypeOrmProveedorRepository = requireRepository();

    await expect(currentRepository.update(999, updateCommand())).rejects.toThrow(
      'El proveedor que se intenta actualizar no existe.',
    );
    await expect(currentRepository.update(2, updateCommand())).rejects.toThrow(
      'El proveedor que se intenta actualizar no existe.',
    );
  });

  it('da de baja el proveedor y sus comerciales activos conservando relaciones y archivo', async (): Promise<void> => {
    await requireRepository().deactivate(1);

    await expect(requireRepository().findById(1)).resolves.toBeNull();

    const dataSource: DataSource = await requireDatabase().connect();

    const providerRows: readonly {
      readonly id_archivo: number | null;
      readonly updated_at: string;
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
            SELECT
              id_archivo,
              updated_at,
              deleted_at
            FROM proveedor
            WHERE id = 1
          `);

    expect(providerRows[0]?.id_archivo).toBe(1);
    expect(providerRows[0]?.deleted_at).not.toBeNull();
    expect(providerRows[0]?.updated_at).toBe(providerRows[0]?.deleted_at);

    const commercialRows: readonly {
      readonly id: number;
      readonly updated_at: string;
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
            SELECT
              id,
              updated_at,
              deleted_at
            FROM comercial
            WHERE id_proveedor = 1
            ORDER BY id
          `);

    /*
     * El comercial que estaba
     * activo recibe exactamente
     * el timestamp del proveedor.
     */
    expect(commercialRows[0]?.deleted_at).toBe(providerRows[0]?.deleted_at);
    expect(commercialRows[0]?.updated_at).toBe(providerRows[0]?.deleted_at);

    /*
     * El comercial que ya estaba
     * eliminado no debe modificarse.
     */
    expect(commercialRows[1]).toEqual({
      id: 2,
      updated_at: '2025-01-02T00:00:00.000Z',
      deleted_at: '2025-01-02T00:00:00.000Z',
    });

    const relationRows: readonly {
      readonly id_marca: number;
    }[] = await dataSource.query(`
            SELECT
              id_marca
            FROM proveedor_marca
            WHERE id_proveedor = 1
            ORDER BY id_marca
          `);

    expect(relationRows).toEqual([
      {
        id_marca: 1,
      },
      {
        id_marca: 3,
      },
    ]);

    const fileRows: readonly {
      readonly deleted_at: string | null;
    }[] = await dataSource.query(`
            SELECT
              deleted_at
            FROM archivo
            WHERE id = 1
          `);

    expect(fileRows).toEqual([
      {
        deleted_at: null,
      },
    ]);
  });

  it('no permite dar de baja un proveedor que no está activo', async (): Promise<void> => {
    const currentRepository: TypeOrmProveedorRepository = requireRepository();

    await currentRepository.deactivate(1);

    await expect(currentRepository.deactivate(1)).rejects.toThrow(
      'El proveedor que se intenta eliminar no existe o ya está dado de baja.',
    );
    await expect(currentRepository.deactivate(999)).rejects.toThrow(
      'El proveedor que se intenta eliminar no existe o ya está dado de baja.',
    );
  });

  it('crea un proveedor enlazando su nuevo logo en la misma transacción', async (): Promise<void> => {
    const proveedor: ProveedorRecord = await requireRepository().create(
      createCommand({
        nombre: 'Proveedor con logo',
        nuevoLogo: createProviderLogo(),
      }),
    );

    expect(proveedor.fotoRelativePath).toBe('files/providers/provider-logo-new.webp');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly purpose: string;
      readonly relative_path: string;
    }[] = await dataSource.query(
      `
      SELECT
        a.purpose,
        a.relative_path
      FROM proveedor p

      INNER JOIN archivo a
        ON a.id = p.id_archivo

      WHERE p.id = ?
    `,
      [proveedor.id],
    );

    expect(rows).toEqual([
      {
        purpose: 'provider_image',
        relative_path: 'files/providers/provider-logo-new.webp',
      },
    ]);
  });

  it('permite quitar el logo sin eliminar su archivo persistido', async (): Promise<void> => {
    const proveedor: ProveedorRecord = await requireRepository().update(
      1,
      updateCommand({
        logo: {
          action: 'remove',
        },
      }),
    );

    expect(proveedor.fotoRelativePath).toBeNull();

    const dataSource: DataSource = await requireDatabase().connect();

    const providerRows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(`
    SELECT id_archivo
    FROM proveedor
    WHERE id = 1
  `);

    expect(providerRows[0]?.id_archivo).toBeNull();

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
    const proveedor: ProveedorRecord = await requireRepository().update(
      1,
      updateCommand({
        logo: {
          action: 'replace',
          nuevoArchivo: createProviderLogo(),
        },
      }),
    );

    expect(proveedor.fotoRelativePath).toBe('files/providers/provider-logo-new.webp');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly id_archivo: number | null;
      readonly relative_path: string | null;
    }[] = await dataSource.query(`
    SELECT
      p.id_archivo,
      a.relative_path
    FROM proveedor p

    LEFT JOIN archivo a
      ON a.id = p.id_archivo

    WHERE p.id = 1
  `);

    expect(rows[0]?.id_archivo).not.toBe(1);

    expect(rows[0]?.relative_path).toBe('files/providers/provider-logo-new.webp');

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

  it('rechaza un archivo que no sea un logo WebP preparado para Proveedores', async (): Promise<void> => {
    await expect(
      requireRepository().update(
        1,
        updateCommand({
          logo: {
            action: 'replace',
            nuevoArchivo: createProviderLogo({
              purpose: 'article_image',
            }),
          },
        }),
      ),
    ).rejects.toThrow('El logo nuevo no pertenece al almacenamiento de imágenes de Proveedores.');

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly id_archivo: number | null;
    }[] = await dataSource.query(`
    SELECT id_archivo
    FROM proveedor
    WHERE id = 1
  `);

    expect(rows[0]?.id_archivo).toBe(1);
  });
});

/**
 * Construye un command de alta.
 */
function createCommand(
  overrides: Partial<CrearProveedorRecordCommand> = {},
): CrearProveedorRecordCommand {
  return {
    nombre: 'Proveedor nuevo',
    direccion: 'Nueva dirección',
    telefono: '944000010',
    email: 'nuevo@example.com',
    web: 'https://nuevo.example.com',
    observaciones: 'Nueva observación',
    idsMarcas: [],
    nuevoLogo: null,
    ...overrides,
  };
}

/**
 * Construye un command de actualización.
 */
function updateCommand(
  overrides: Partial<ActualizarProveedorRecordCommand> = {},
): ActualizarProveedorRecordCommand {
  return {
    nombre: 'Proveedor B actualizado',
    direccion: 'Dirección actualizada',
    telefono: '944999999',
    email: 'actualizado@example.com',
    web: 'https://actualizado.example.com',
    observaciones: 'Observaciones actualizadas',
    idsMarcas: [2],
    logo: {
      action: 'keep',
    },
    ...overrides,
  };
}

/**
 * Crea todas las tablas de la aplicación
 * sobre la SQLite temporal del test.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta un escenario suficientemente rico
 * para probar todas las reglas de Proveedores.
 */
async function seedProveedores(dataSource: DataSource): Promise<void> {
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
        'proveedor-b-file',
        'provider_image',
        'proveedor-b.png',
        'proveedor-b.webp',
        'files/providers/proveedor-b.webp',
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
      nombre,
      deleted_at
    )
    VALUES
      (
        1,
        'marca-a',
        'Marca A',
        NULL
      ),
      (
        2,
        'marca-b',
        'Marca B',
        NULL
      ),
      (
        3,
        'marca-eliminada',
        'Marca eliminada',
        '2025-01-01T00:00:00.000Z'
      )
  `);

  await dataSource.query(`
    INSERT INTO proveedor (
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
        'proveedor-b',
        1,
        'Proveedor B',
        'Dirección original',
        '944000001',
        'proveedor-b@example.com',
        'https://proveedor-b.example.com',
        'Observaciones originales',
        NULL
      ),
      (
        2,
        'proveedor-eliminado',
        NULL,
        'Proveedor eliminado',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '2025-01-01T00:00:00.000Z'
      )
  `);

  /*
   * La relación con Marca 3 representa
   * una asociación histórica:
   *
   * la marca fue eliminada después de
   * haberse relacionado con el proveedor.
   */
  await dataSource.query(`
    INSERT INTO proveedor_marca (
      id_proveedor,
      id_marca
    )
    VALUES
      (
        1,
        1
      ),
      (
        1,
        3
      )
  `);

  await dataSource.query(`
    INSERT INTO comercial (
      id,
      public_id,
      id_proveedor,
      nombre,
      telefono,
      email,
      observaciones,
      updated_at,
      deleted_at
    )
    VALUES
      (
        1,
        'comercial-activo',
        1,
        'Comercial activo',
        '600000001',
        'comercial@example.com',
        'Comercial principal',
        CURRENT_TIMESTAMP,
        NULL
      ),
      (
        2,
        'comercial-eliminado',
        1,
        'Comercial eliminado',
        '600000002',
        NULL,
        NULL,
        '2025-01-02T00:00:00.000Z',
        '2025-01-02T00:00:00.000Z'
      )
  `);
}

/**
 * Devuelve el repository inicializado.
 */
function requireRepository(): TypeOrmProveedorRepository {
  if (repository === null) {
    throw new Error('El repository de test no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la base de datos inicializada.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de test no está inicializada.');
  }

  return applicationDatabase;
}

/**
 * Construye los metadatos de un logo WebP
 * preparado específicamente para Proveedores.
 */
function createProviderLogo(overrides: Partial<ArchivoCreateRecord> = {}): ArchivoCreateRecord {
  return {
    publicId: 'provider-logo-new',
    purpose: 'provider_image',
    originalName: 'provider-logo.png',
    internalName: 'provider-logo-new.webp',
    relativePath: 'files/providers/provider-logo-new.webp',
    mimeType: 'image/webp',
    sizeBytes: 4321,
    sha256: 'b'.repeat(64),
    width: 900,
    height: 600,
    ...overrides,
  };
}
