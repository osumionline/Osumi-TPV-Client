import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import type { DataSource } from 'typeorm';

/**
 * Prepara la base de datos representativa utilizada
 * por los tests de integración de Almacén.
 */
export default async function prepareAlmacenRepositoriesFixture(
  dataSource: DataSource,
): Promise<void> {
  await createSchema(dataSource);
  await seedInventario(dataSource);
  await seedCaducidades(dataSource);
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
 * Inserta un inventario representativo y ventas históricas.
 */
async function seedInventario(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO marca (
      id,
      public_id,
      nombre
    )
    VALUES
      (1, 'brand-1', 'Marca Uno'),
      (2, 'brand-2', 'Marca Dos')
  `);

  await dataSource.query(`
    INSERT INTO proveedor (
      id,
      public_id,
      nombre
    )
    VALUES
      (1, 'provider-1', 'Proveedor Uno'),
      (2, 'provider-2', 'Proveedor Dos')
  `);

  await dataSource.query(`
    INSERT INTO categoria (
      id,
      public_id,
      id_padre,
      nombre,
      orden
    )
    VALUES
      (1, 'category-parent', NULL, 'Categoría padre', 1),
      (2, 'category-child', 1, 'Categoría hija', 2)
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
      stock,
      deleted_at
    )
    VALUES
      (
        1,
        'article-alpha',
        261001,
        'Artículo Alfa',
        'articulo-alfa',
        1,
        1,
        'REF-A',
        1000000,
        1210000,
        200,
        NULL,
        2100,
        0,
        395000,
        2,
        NULL
      ),
      (
        2,
        'article-beta',
        261002,
        'Artículo Beta',
        'articulo-beta',
        2,
        1,
        'REF-B',
        1600000,
        2000000,
        300,
        250,
        2100,
        400,
        333333,
        3,
        NULL
      ),
      (
        3,
        'article-gamma',
        261003,
        'Artículo Gamma',
        'articulo-gamma',
        1,
        NULL,
        NULL,
        400000,
        500000,
        100,
        NULL,
        1000,
        0,
        500000,
        -1,
        NULL
      ),
      (
        4,
        'article-deleted',
        261004,
        'Artículo eliminado',
        'articulo-eliminado',
        1,
        2,
        'REF-DELETED',
        999000000,
        999000000,
        99900,
        99000,
        2100,
        0,
        999999,
        999,
        '2026-01-01T00:00:00.000Z'
      )
  `);

  await dataSource.query(`
    INSERT INTO articulo_categoria (
      id_articulo,
      id_categoria
    )
    VALUES
      (1, 1),
      (1, 2),
      (2, 2),
      (3, 1)
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
      (1, 'barcode-alpha-default', 1, '261001', 1),
      (2, 'barcode-beta-default', 2, '261002', 1),
      (3, 'barcode-beta-extra', 2, 'EXTRA-BETA', 0),
      (4, 'barcode-gamma-default', 3, '261003', 1)
  `);

  await dataSource.query(`
    INSERT INTO etiqueta (
      id,
      public_id,
      texto,
      slug
    )
    VALUES (
      1,
      'tag-liquidacion',
      'Liquidación',
      'liquidacion'
    )
  `);

  await dataSource.query(`
    INSERT INTO articulo_etiqueta (
      id_articulo,
      id_etiqueta
    )
    VALUES (
      3,
      1
    )
  `);

  await seedSales(dataSource);
}

/**
 * Inserta pérdidas históricas representativas para
 * probar filtros, snapshots y agregados.
 */
async function seedCaducidades(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO merma_caducidad (
      id,
      public_id,
      id_articulo,
      localizador_snapshot,
      id_marca_snapshot,
      marca_nombre_snapshot,
      articulo_nombre_snapshot,
      unidades,
      puc_micros,
      pvp_cents,
      fecha_baja,
      deleted_at
    )
    VALUES
      (
        1,
        'expiration-alpha',
        1,
        240719,
        1,
        'Marca Uno',
        'Artículo Alfa histórico',
        2,
        1000000,
        200,
        '2026-08-20T10:00:00.000Z',
        NULL
      ),
      (
        2,
        'expiration-beta',
        2,
        240720,
        2,
        'Marca Dos',
        'Artículo Beta histórico',
        3,
        2000000,
        300,
        '2026-07-10T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'expiration-legacy',
        1,
        230001,
        9,
        'Marca Histórica',
        'Artículo Legacy',
        4,
        500000,
        100,
        '2025-12-05 10:30:00',
        NULL
      ),
      (
        4,
        'expiration-deleted',
        3,
        261003,
        1,
        'Marca Uno',
        'Caducidad eliminada',
        10,
        999000000,
        99900,
        '2026-09-01T10:00:00.000Z',
        '2026-09-02T10:00:00.000Z'
      )
  `);
}

/**
 * Inserta ventas recientes, antiguas y devoluciones
 * para validar el aviso de doce meses.
 */
async function seedSales(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      id,
      public_id,
      nombre,
      codigo
    )
    VALUES (
      1,
      'terminal-almacen',
      'Terminal almacén',
      'ALMACEN'
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
      admin
    )
    VALUES (
      1,
      'employee-almacen',
      'Empleado almacén',
      'test-hash',
      'scrypt',
      '000000',
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
      'cash-almacen',
      1,
      1,
      '2025-01-01T00:00:00.000Z'
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
        'sale-alpha-recent',
        1,
        1,
        1,
        200,
        '2026-08-01T10:00:00.000Z',
        NULL
      ),
      (
        2,
        'sale-beta-return',
        1,
        1,
        2,
        -300,
        '2026-08-02T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'sale-gamma-old',
        1,
        1,
        3,
        100,
        '2025-01-01T10:00:00.000Z',
        NULL
      ),
      (
        4,
        'sale-gamma-deleted',
        1,
        1,
        4,
        100,
        '2026-08-03T10:00:00.000Z',
        '2026-08-03T11:00:00.000Z'
      )
  `);

  await dataSource.query(`
    INSERT INTO linea_venta (
      id,
      public_id,
      id_venta,
      id_articulo,
      localizador,
      marca,
      nombre_articulo,
      importe_micros,
      unidades
    )
    VALUES
      (
        1,
        'line-alpha-recent',
        1,
        1,
        261001,
        'Marca Uno',
        'Artículo Alfa',
        2000000,
        1
      ),
      (
        2,
        'line-beta-return',
        2,
        2,
        261002,
        'Marca Dos',
        'Artículo Beta',
        -3000000,
        -1
      ),
      (
        3,
        'line-gamma-old',
        3,
        3,
        261003,
        'Marca Uno',
        'Artículo Gamma',
        1000000,
        1
      ),
      (
        4,
        'line-gamma-deleted',
        4,
        3,
        261003,
        'Marca Uno',
        'Artículo Gamma',
        1000000,
        1
      )
  `);
}
