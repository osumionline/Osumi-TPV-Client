import type { ArticuloRecord } from '@backend/domain/articulos/articulo-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmArticulosRepository from '@infrastructure/database/typeorm/typeorm-articulos.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmArticulosRepository | null = null;

describe('TypeOrmArticulosRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-articulos-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'articulos.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedArticulo(dataSource);

    repository = new TypeOrmArticulosRepository(applicationDatabase);
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

  it('carga categorías, códigos, datos web y fotos del artículo', async (): Promise<void> => {
    const articulo: ArticuloRecord | null = await requireRepository().findById(1);

    expect(articulo).toMatchObject({
      id: 1,
      localizador: 261234,
      nombre: 'Artículo de prueba',
      idMarca: 1,
      idProveedor: 1,
      idsCategorias: [1, 2],
      ventaOnline: true,
      mostrarEnWeb: false,
      descripcionCorta: 'Descripción corta',
      descripcionLarga: 'Descripción larga',
      stock: 8,
    });

    expect(articulo?.codigosBarras).toEqual([
      {
        id: 1,
        publicId: 'barcode-default',
        codigo: '261234',
        porDefecto: true,
      },
      {
        id: 2,
        publicId: 'barcode-extra',
        codigo: 'ABC-123',
        porDefecto: false,
      },
    ]);

    expect(articulo?.fotos[0]).toMatchObject({
      publicId: 'file-public-id',
      relativePath: 'articles/1/photo.webp',
      mimeType: 'image/webp',
      orden: 0,
      principal: true,
    });
  });

  it('resuelve el artículo por acceso directo, localizador y código de barras', async (): Promise<void> => {
    const currentRepository = requireRepository();

    expect(await currentRepository.resolveIdByCode('12', 12)).toBe(1);
    expect(await currentRepository.resolveIdByCode('261234', 261234)).toBe(1);
    expect(await currentRepository.resolveIdByCode('ABC-123', null)).toBe(1);
  });

  it('no devuelve artículos dados de baja', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
        UPDATE articulo
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `,
    );

    expect(await requireRepository().findById(1)).toBeNull();
    expect(await requireRepository().resolveIdByCode('261234', 261234)).toBeNull();
  });
});

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
 * Inserta un artículo completo con relaciones para los tests.
 */
async function seedArticulo(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO marca (
      id,
      public_id,
      nombre
    )
    VALUES (
      1,
      'brand-public-id',
      'Marca de prueba'
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
      'provider-public-id',
      'Proveedor de prueba'
    )
  `);

  await dataSource.query(`
    INSERT INTO categoria (
      id,
      public_id,
      nombre
    )
    VALUES
      (1, 'category-1', 'Categoría 1'),
      (2, 'category-2', 'Categoría 2')
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
      'article-public-id',
      261234,
      'Artículo de prueba',
      'articulo de prueba',
      1,
      1,
      'REF-1',
      590000,
      744580,
      100,
      90,
      2100,
      520,
      255420,
      172689,
      8,
      2,
      20,
      5,
      1,
      0,
      'Descripción corta',
      'Descripción larga',
      'Observaciones',
      1,
      0,
      12
    )
  `);

  await dataSource.query(`
    INSERT INTO articulo_categoria (
      id_articulo,
      id_categoria
    )
    VALUES
      (1, 1),
      (1, 2)
  `);

  await dataSource.query(`
    INSERT INTO codigo_barras (
      id,
      public_id,
      id_articulo,
      codigo,
      por_defecto
    )
    VALUES
      (1, 'barcode-default', 1, '261234', 1),
      (2, 'barcode-extra', 1, 'ABC-123', 0)
  `);

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
        'file-public-id',
        'article_image',
        'photo.jpg',
        'photo.webp',
        'articles/1/photo.webp',
        'image/webp',
        12345,
        ?,
        800,
        800
      )
    `,
    ['a'.repeat(64)],
  );

  await dataSource.query(`
    INSERT INTO articulo_archivo (
      id_articulo,
      id_archivo,
      tipo,
      orden,
      principal
    )
    VALUES (
      1,
      1,
      'imagen',
      0,
      1
    )
  `);
}

/**
 * Devuelve el repository inicializado para el test.
 */
function requireRepository(): TypeOrmArticulosRepository {
  if (repository === null) {
    throw new Error('El repository de Artículos no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la conexión de aplicación inicializada para el test.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de Artículos no está inicializada.');
  }

  return applicationDatabase;
}
