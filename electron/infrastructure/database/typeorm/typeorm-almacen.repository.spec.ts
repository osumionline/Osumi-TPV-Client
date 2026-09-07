import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmAlmacenRepository from '@infrastructure/database/typeorm/typeorm-almacen.repository';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmAlmacenRepository | null = null;

describe('TypeOrmAlmacenRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-almacen-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'almacen.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedInventario(dataSource);

    repository = new TypeOrmAlmacenRepository(applicationDatabase);
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

  it('recupera la página con categorías, flags y agregados globales', async (): Promise<void> => {
    const result: InventarioResultadoRecord =
      await requireRepository().searchInventario(createQuery());

    expect(result.totalRows).toBe(3);
    expect(result.rows).toHaveLength(3);

    expect(result.rows[0]).toMatchObject({
      id: 1,
      localizador: 261001,
      nombre: 'Artículo Alfa',
      idsCategorias: [1, 2],
      tieneCodigoAdicional: false,
      sinVentasUltimos12Meses: false,
    });

    expect(result.rows[1]).toMatchObject({
      id: 2,
      localizador: 261002,
      nombre: 'Artículo Beta',
      idsCategorias: [2],
      tieneCodigoAdicional: true,
      sinVentasUltimos12Meses: true,
    });

    expect(result.rows[2]).toMatchObject({
      id: 3,
      localizador: 261003,
      nombre: 'Artículo Gamma',
      idProveedor: null,
      proveedorNombre: null,
      idsCategorias: [1],
      tieneCodigoAdicional: false,
      sinVentasUltimos12Meses: true,
    });

    expect(result.mediaMargenMicroporcentaje).toBeCloseTo((395_000 + 333_333 + 500_000) / 3);
    expect(result.totalPucMicros).toBe(7_920_000);
    expect(result.totalPvpCents).toBe(1_200);
  });

  it('pagina filas sin limitar los totales del conjunto filtrado', async (): Promise<void> => {
    const result: InventarioResultadoRecord = await requireRepository().searchInventario(
      createQuery({
        offset: 1,
        limit: 1,
      }),
    );

    expect(result.totalRows).toBe(3);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe(2);

    expect(result.totalPucMicros).toBe(7_920_000);
    expect(result.totalPvpCents).toBe(1_200);
  });

  it('filtra categorías por asociación explícita sin incluir descendientes', async (): Promise<void> => {
    const result: InventarioResultadoRecord = await requireRepository().searchInventario(
      createQuery({
        idCategoria: 1,
      }),
    );

    expect(result.rows.map((row): number => row.id)).toEqual([1, 3]);

    expect(result.rows.some((row): boolean => row.id === 2)).toBe(false);
  });

  it('combina los filtros exactos de proveedor y marca', async (): Promise<void> => {
    const result: InventarioResultadoRecord = await requireRepository().searchInventario(
      createQuery({
        idProveedor: 1,
        idMarca: 2,
      }),
    );

    expect(result.rows.map((row): number => row.id)).toEqual([2]);
  });

  it('busca por localizador, referencia, código de barras y etiqueta', async (): Promise<void> => {
    const currentRepository: TypeOrmAlmacenRepository = requireRepository();

    const byLocalizador: InventarioResultadoRecord = await currentRepository.searchInventario(
      createQuery({
        texto: '261001',
      }),
    );
    const byReferencia: InventarioResultadoRecord = await currentRepository.searchInventario(
      createQuery({
        texto: 'ref-b',
      }),
    );
    const byBarcode: InventarioResultadoRecord = await currentRepository.searchInventario(
      createQuery({
        texto: 'extra-beta',
      }),
    );
    const byTag: InventarioResultadoRecord = await currentRepository.searchInventario(
      createQuery({
        texto: 'liquidación',
      }),
    );

    expect(byLocalizador.rows.map((row): number => row.id)).toEqual([1]);
    expect(byReferencia.rows.map((row): number => row.id)).toEqual([2]);
    expect(byBarcode.rows.map((row): number => row.id)).toEqual([2]);
    expect(byTag.rows.map((row): number => row.id)).toEqual([3]);
  });

  it('filtra por existencia de precio de descuento persistido', async (): Promise<void> => {
    const result: InventarioResultadoRecord = await requireRepository().searchInventario(
      createQuery({
        conDescuento: true,
      }),
    );

    expect(result.rows.map((row): number => row.id)).toEqual([2]);
  });

  it('recupera para reportes todas las filas persistidas del filtro', async (): Promise<void> => {
    const result = await requireRepository().getInventarioReport({
      idProveedor: null,
      idMarca: null,
      idCategoria: null,
      texto: null,
      conDescuento: false,
    });

    expect(result.totalRows).toBe(3);
    expect(result.rows).toHaveLength(3);

    expect(result.rows[0]).toMatchObject({
      localizador: 261001,
      categorias: ['Categoría hija', 'Categoría padre'],
      codigosBarrasAdicionales: [],
    });

    expect(result.rows[1]).toMatchObject({
      localizador: 261002,
      categorias: ['Categoría hija'],
      codigosBarrasAdicionales: ['EXTRA-BETA'],
    });

    expect(result.totalPucMicros).toBe(7_920_000);
    expect(result.totalPvpCents).toBe(1_200);
  });

  it('aplica al reporte los mismos filtros de Inventario', async (): Promise<void> => {
    const result = await requireRepository().getInventarioReport({
      idProveedor: null,
      idMarca: null,
      idCategoria: 2,
      texto: 'beta',
      conDescuento: true,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.localizador).toBe(261002);
  });

  it('persiste la escritura reducida con categorías, código e histórico manual de stock', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    const command: InventarioSaveRecord = {
      idArticulo: 1,
      idsCategorias: [2],
      stock: -5,
      precioAlbaranMicros: 1_100_000,
      pucMicros: 1_331_000,
      pvpCents: 250,
      margenMicroporcentaje: 444_444,
      codigoAdicional: 'ALFA-EXTRA',
    };

    await requireRepository().saveInventarioRows([command]);

    const articleRows = (await dataSource.query(
      `
      SELECT
        nombre,
        stock,
        palb_micros,
        puc_micros,
        pvp_cents,
        margen_microporcentaje,
        pvp_descuento_cents
      FROM articulo
      WHERE id = 1
    `,
    )) as readonly {
      readonly nombre: string;
      readonly stock: number;
      readonly palb_micros: number;
      readonly puc_micros: number;
      readonly pvp_cents: number;
      readonly margen_microporcentaje: number;
      readonly pvp_descuento_cents: number | null;
    }[];

    expect(articleRows[0]).toEqual({
      nombre: 'Artículo Alfa',
      stock: -5,
      palb_micros: 1_100_000,
      puc_micros: 1_331_000,
      pvp_cents: 250,
      margen_microporcentaje: 444_444,
      pvp_descuento_cents: null,
    });

    const categoryRows = (await dataSource.query(
      `
      SELECT id_categoria
      FROM articulo_categoria
      WHERE id_articulo = 1
      ORDER BY id_categoria
    `,
    )) as readonly {
      readonly id_categoria: number;
    }[];

    expect(categoryRows.map((row): number => row.id_categoria)).toEqual([2]);

    const barcodeRows = (await dataSource.query(
      `
      SELECT codigo
      FROM codigo_barras
      WHERE
        id_articulo = 1
        AND por_defecto = 0
        AND deleted_at IS NULL
    `,
    )) as readonly {
      readonly codigo: string;
    }[];

    expect(barcodeRows).toEqual([
      {
        codigo: 'ALFA-EXTRA',
      },
    ]);

    const historyRows = (await dataSource.query(
      `
      SELECT
        tipo,
        stock_previo,
        diferencia,
        stock_final,
        puc_micros,
        pvp_micros
      FROM historico_articulo
      WHERE id_articulo = 1
      ORDER BY id DESC
      LIMIT 1
    `,
    )) as readonly {
      readonly tipo: number;
      readonly stock_previo: number;
      readonly diferencia: number;
      readonly stock_final: number;
      readonly puc_micros: number;
      readonly pvp_micros: number;
    }[];

    expect(historyRows[0]).toEqual({
      tipo: 4,
      stock_previo: 2,
      diferencia: -7,
      stock_final: -5,
      puc_micros: 1_331_000,
      pvp_micros: 2_500_000,
    });
  });

  it('hace rollback completo si una fila falla dentro de Guardar todos', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    const firstCommand: InventarioSaveRecord = {
      idArticulo: 1,
      idsCategorias: [2],
      stock: 20,
      precioAlbaranMicros: 1_500_000,
      pucMicros: 1_815_000,
      pvpCents: 350,
      margenMicroporcentaje: 500_000,
      codigoAdicional: null,
    };

    const invalidSecondCommand: InventarioSaveRecord = {
      idArticulo: 2,
      idsCategorias: [2],
      stock: 3,
      precioAlbaranMicros: 1_600_000,
      pucMicros: 2_000_000,
      pvpCents: 300,
      margenMicroporcentaje: 333_333,
      codigoAdicional: 'NUEVO-BETA',
    };

    await expect(
      requireRepository().saveInventarioRows([firstCommand, invalidSecondCommand]),
    ).rejects.toThrow('El artículo ya tiene un código de barras adicional.');

    const articleRows = (await dataSource.query(
      `
      SELECT
        stock,
        palb_micros,
        puc_micros,
        pvp_cents
      FROM articulo
      WHERE id = 1
    `,
    )) as readonly {
      readonly stock: number;
      readonly palb_micros: number;
      readonly puc_micros: number;
      readonly pvp_cents: number;
    }[];

    expect(articleRows[0]).toEqual({
      stock: 2,
      palb_micros: 1_000_000,
      puc_micros: 1_210_000,
      pvp_cents: 200,
    });

    const categoryRows = (await dataSource.query(
      `
      SELECT id_categoria
      FROM articulo_categoria
      WHERE id_articulo = 1
      ORDER BY id_categoria
    `,
    )) as readonly {
      readonly id_categoria: number;
    }[];

    expect(categoryRows.map((row): number => row.id_categoria)).toEqual([1, 2]);

    const historyRows = (await dataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM historico_articulo
      WHERE id_articulo = 1
    `,
    )) as readonly {
      readonly total: number;
    }[];

    expect(historyRows[0]?.total).toBe(0);
  });

  it('rechaza un código adicional activo que ya pertenece a otro artículo', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    const command: InventarioSaveRecord = {
      idArticulo: 1,
      idsCategorias: [1, 2],
      stock: 2,
      precioAlbaranMicros: 1_000_000,
      pucMicros: 1_210_000,
      pvpCents: 200,
      margenMicroporcentaje: 395_000,
      codigoAdicional: 'EXTRA-BETA',
    };

    await expect(requireRepository().saveInventarioRows([command])).rejects.toThrow(
      'El código "EXTRA-BETA" ya está siendo utilizado.',
    );

    const rows = (await dataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM codigo_barras
      WHERE
        id_articulo = 1
        AND por_defecto = 0
        AND deleted_at IS NULL
    `,
    )) as readonly {
      readonly total: number;
    }[];

    expect(rows[0]?.total).toBe(0);
  });

  it('da de baja artículo y códigos conservando el histórico', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await requireRepository().saveInventarioRows([
      {
        idArticulo: 3,
        idsCategorias: [1],
        stock: -4,
        precioAlbaranMicros: 400_000,
        pucMicros: 500_000,
        pvpCents: 100,
        margenMicroporcentaje: 500_000,
        codigoAdicional: null,
      },
    ]);

    await requireRepository().deactivateArticulo(3);

    const articleRows = (await dataSource.query(
      `
      SELECT deleted_at
      FROM articulo
      WHERE id = 3
    `,
    )) as readonly {
      readonly deleted_at: string | null;
    }[];

    expect(articleRows[0]?.deleted_at).not.toBeNull();

    const barcodeRows = (await dataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM codigo_barras
      WHERE
        id_articulo = 3
        AND deleted_at IS NULL
    `,
    )) as readonly {
      readonly total: number;
    }[];

    expect(barcodeRows[0]?.total).toBe(0);

    const historyRows = (await dataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM historico_articulo
      WHERE id_articulo = 3
    `,
    )) as readonly {
      readonly total: number;
    }[];

    expect(historyRows[0]?.total).toBe(1);

    const result: InventarioResultadoRecord =
      await requireRepository().searchInventario(createQuery());

    expect(result.rows.some((row): boolean => row.id === 3)).toBe(false);
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

/**
 * Crea una query interna válida para los tests.
 */
function createQuery(
  overrides: Partial<InventarioRepositoryQuery> = {},
): InventarioRepositoryQuery {
  return {
    idProveedor: null,
    idMarca: null,
    idCategoria: null,
    texto: null,
    conDescuento: false,
    ventasDesde: '2025-09-07T08:00:00.000Z',
    offset: 0,
    limit: 20,
    ...overrides,
  };
}

/**
 * Devuelve la conexión SQLite inicializada para el test.
 */
async function requireDataSource(): Promise<DataSource> {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de Almacén no está inicializada.');
  }

  return applicationDatabase.connect();
}

/**
 * Devuelve el repository inicializado para el test.
 */
function requireRepository(): TypeOrmAlmacenRepository {
  if (repository === null) {
    throw new Error('El repository de Almacén no está inicializado.');
  }

  return repository;
}
