import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import InformeVentasService from '@backend/application/caja/informes/informe-ventas.service';
import type {
  InformeVentasArticulo,
  InformeVentasCategoria,
  InformeVentasMarca,
  InformeVentasResultado,
} from '@desktop-contracts/caja/informes/informe-ventas.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmInformeVentasRepository from '@infrastructure/database/typeorm/caja/informes/typeorm-informe-ventas.repository';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface VentaSeed {
  readonly id: number;
  readonly publicId: string;
  readonly numero: number;
  readonly totalCents: number;
  readonly createdAt: string;
  readonly deletedAt?: string | null;
}

interface LineaSeed {
  readonly id: number;
  readonly publicId: string;
  readonly idVenta: number;
  readonly idArticulo: number;
  readonly idMarcaSnapshot: number | null;
  readonly localizador: number;
  readonly marca: string;
  readonly nombreArticulo: string;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly importeMicros: number;
  readonly unidades: number;
}

let tempDirectory: string | null = null;

let applicationDatabase: TypeOrmApplicationDatabase | null = null;

let service: InformeVentasService | null = null;

describe('InformeVentasService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-informe-ventas-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'informe-ventas.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);

    await seedInformeVentas(dataSource);

    service = new InformeVentasService(
      new TypeOrmInformeVentasRepository(applicationDatabase),
      new InformePeriodoResolver(),
    );
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

    service = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('construye el árbol y deduplica una línea presente en varias ramas', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    expect(root).toMatchObject({
      idCategoria: 1,
      categoriaPublicId: 'categoria-root',
      nombre: 'Root',

      importeMicros: 43_000_000,

      unidades: 3,

      ventasPvpMicros: 45_000_000,

      beneficioMicros: 16_000_000,

      margenBps: 3556,
    });

    expect(
      root.subcategorias.map((categoria: InformeVentasCategoria): string => categoria.nombre),
    ).toEqual(['A', 'B']);

    const categoryA: InformeVentasCategoria = requireSubcategoria(root, 'A');

    expect(categoryA).toMatchObject({
      importeMicros: 38_000_000,

      unidades: 3,

      ventasPvpMicros: 40_000_000,

      beneficioMicros: 16_000_000,

      margenBps: 4000,
    });

    const categoryB: InformeVentasCategoria = requireSubcategoria(root, 'B');

    expect(categoryB).toMatchObject({
      importeMicros: 18_000_000,

      unidades: 2,

      ventasPvpMicros: 20_000_000,

      beneficioMicros: 8_000_000,

      margenBps: 4000,
    });

    /*
     * La misma línea del artículo Multi está
     * correctamente visible en A y B.
     */
    expect(categoryA.articulos[0]?.articuloPublicId).toBe('articulo-multi');

    expect(categoryB.articulos[0]?.articuloPublicId).toBe('articulo-multi');

    /*
     * Sin embargo, Root la suma una sola vez.
     *
     * La suma visual de sus ramas/directos es
     * deliberadamente mayor que su agregado.
     */
    expect(categoryA.importeMicros + categoryB.importeMicros + root.marcas[0]!.importeMicros).toBe(
      61_000_000,
    );

    expect(root.importeMicros).toBe(43_000_000);
  });

  it('preserva snapshots históricos de artículo y marca', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    const categoryA: InformeVentasCategoria = requireSubcategoria(root, 'A');

    const articulo: InformeVentasArticulo | undefined = categoryA.articulos[0];

    expect(articulo).toEqual({
      idArticulo: 1,
      articuloPublicId: 'articulo-multi',

      idMarcaSnapshot: 1,

      marca: 'Alpha histórica',

      nombre: 'Multi histórico',

      importeMicros: 18_000_000,

      unidades: 2,

      ventasPvpMicros: 20_000_000,

      beneficioMicros: 8_000_000,

      margenBps: 4000,
    });
  });

  it('agrupa por marca usando margen ponderado y no media simple', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    expect(root.articulos).toHaveLength(2);

    const marca: InformeVentasMarca | undefined = root.marcas[0];

    expect(marca).toEqual({
      idMarcaSnapshot: 2,
      nombre: 'Beta histórica',

      importeMicros: 5_000_000,

      unidades: 0,

      ventasPvpMicros: 5_000_000,

      beneficioMicros: 0,

      /*
       * Los artículos directos tienen márgenes
       * 30 % y 60 %, pero el agregado correcto
       * es beneficio 0 / PVP 5 € = 0 %.
       */
      margenBps: 0,
    });
  });

  it('omite ramas sin actividad pero conserva descendientes con ventas', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    expect(
      root.subcategorias.map((categoria: InformeVentasCategoria): string => categoria.nombre),
    ).not.toContain('Vacía');

    const categoryA: InformeVentasCategoria = requireSubcategoria(root, 'A');

    const deep: InformeVentasCategoria = requireSubcategoria(categoryA, 'Profunda');

    expect(deep).toMatchObject({
      importeMicros: 20_000_000,

      unidades: 1,

      ventasPvpMicros: 20_000_000,

      beneficioMicros: 8_000_000,

      margenBps: 4000,
    });
  });

  it('excluye ventas borradas y categorías eliminadas', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    expect(root.importeMicros).toBe(43_000_000);

    expect(
      root.subcategorias.map((categoria: InformeVentasCategoria): string => categoria.nombre),
    ).not.toContain('Eliminada');
  });

  it('devuelve null cuando la categoría existe pero no tiene ventas', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 10,
      idCategoria: 1,
    });

    expect(result.categoria).toBeNull();
  });

  it('resuelve Todos como el año natural completo', async (): Promise<void> => {
    const result: InformeVentasResultado = await requireService().getInforme({
      year: 2026,
      month: 'todos',
      idCategoria: 1,
    });

    const root: InformeVentasCategoria = requireCategoria(result);

    expect(root).toMatchObject({
      importeMicros: 53_000_000,

      unidades: 4,

      ventasPvpMicros: 55_000_000,

      beneficioMicros: 20_000_000,

      margenBps: 3636,
    });
  });

  it('rechaza una categoría inexistente', async (): Promise<void> => {
    await expect(
      requireService().getInforme({
        year: 2026,
        month: 9,
        idCategoria: 999,
      }),
    ).rejects.toThrow('La categoría seleccionada no existe.');
  });
});

/**
 * Crea el esquema completo actual.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta un escenario que cubre árbol,
 * multicategoría, devoluciones y exclusiones.
 */
async function seedInformeVentas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      id,
      public_id,
      nombre,
      codigo
    )
    VALUES (
      1,
      'terminal-informes',
      'Terminal informes',
      'INFORMES'
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
      'empleado-informes',
      'Empleado informes',
      'hash-test',
      'scrypt',
      'FFFFFF',
      1,
      1
    )
  `);

  await dataSource.query(
    `
      INSERT INTO caja (
        id,
        public_id,
        id_terminal,
        id_empleado_apertura,
        apertura
      )
      VALUES (
        1,
        'caja-informes',
        1,
        1,
        ?
      )
    `,
    [localIso(2025, 1, 1, 8)],
  );

  await dataSource.query(`
    INSERT INTO marca (
      id,
      public_id,
      nombre
    )
    VALUES
      (
        1,
        'marca-alpha',
        'Alpha actual'
      ),
      (
        2,
        'marca-beta',
        'Beta actual'
      )
  `);

  await dataSource.query(
    `
      INSERT INTO categoria (
        id,
        public_id,
        id_padre,
        nombre,
        orden,
        deleted_at
      )
      VALUES
        (1, 'categoria-root', NULL, 'Root', 1, NULL),
        (2, 'categoria-a', 1, 'A', 1, NULL),
        (3, 'categoria-b', 1, 'B', 2, NULL),
        (4, 'categoria-profunda', 2, 'Profunda', 1, NULL),
        (5, 'categoria-vacia', 1, 'Vacía', 3, NULL),
        (6, 'categoria-externa', NULL, 'Externa', 2, NULL),
        (7, 'categoria-eliminada', 1, 'Eliminada', 4, ?)
    `,
    [localIso(2026, 8, 1, 10)],
  );

  await dataSource.query(`
    INSERT INTO articulo (
      id,
      public_id,
      localizador,
      nombre,
      slug,
      id_marca
    )
    VALUES
      (
        1,
        'articulo-multi',
        1001,
        'Multi actual',
        'multi-actual',
        2
      ),
      (
        2,
        'articulo-profundo',
        1002,
        'Profundo actual',
        'profundo-actual',
        2
      ),
      (
        3,
        'articulo-devolucion',
        1003,
        'Devolución actual',
        'devolucion-actual',
        2
      ),
      (
        4,
        'articulo-directo',
        1004,
        'Directo actual',
        'directo-actual',
        2
      ),
      (
        5,
        'articulo-externo',
        1005,
        'Externo actual',
        'externo-actual',
        1
      ),
      (
        6,
        'articulo-eliminada',
        1006,
        'Eliminada actual',
        'eliminada-actual',
        1
      )
  `);

  await dataSource.query(`
    INSERT INTO articulo_categoria (
      id_articulo,
      id_categoria
    )
    VALUES
      (1, 2),
      (1, 3),
      (2, 4),
      (3, 1),
      (4, 1),
      (5, 6),
      (6, 7)
  `);

  await insertVenta(dataSource, {
    id: 1,
    publicId: 'venta-enero-profundo',
    numero: 1001,
    totalCents: 1000,
    createdAt: localIso(2026, 1, 10, 10),
  });

  await insertLinea(dataSource, {
    id: 1,
    publicId: 'linea-enero-profundo',
    idVenta: 1,
    idArticulo: 2,
    idMarcaSnapshot: 2,
    localizador: 1002,
    marca: 'Beta histórica',
    nombreArticulo: 'Profundo histórico',
    pucMicros: 6_000_000,
    pvpMicros: 10_000_000,
    importeMicros: 10_000_000,
    unidades: 1,
  });

  await insertVenta(dataSource, {
    id: 2,
    publicId: 'venta-septiembre-multi',
    numero: 1002,
    totalCents: 1800,
    createdAt: localIso(2026, 9, 1, 10),
  });

  await insertLinea(dataSource, {
    id: 2,
    publicId: 'linea-septiembre-multi',
    idVenta: 2,
    idArticulo: 1,
    idMarcaSnapshot: 1,
    localizador: 1001,
    marca: 'Alpha histórica',
    nombreArticulo: 'Multi histórico',
    pucMicros: 6_000_000,
    pvpMicros: 10_000_000,
    importeMicros: 18_000_000,
    unidades: 2,
  });

  await insertVenta(dataSource, {
    id: 3,
    publicId: 'venta-septiembre-profundo',
    numero: 1003,
    totalCents: 2000,
    createdAt: localIso(2026, 9, 2, 10),
  });

  await insertLinea(dataSource, {
    id: 3,
    publicId: 'linea-septiembre-profundo',
    idVenta: 3,
    idArticulo: 2,
    idMarcaSnapshot: 2,
    localizador: 1002,
    marca: 'Beta histórica',
    nombreArticulo: 'Profundo histórico',
    pucMicros: 12_000_000,
    pvpMicros: 20_000_000,
    importeMicros: 20_000_000,
    unidades: 1,
  });

  await insertVenta(dataSource, {
    id: 4,
    publicId: 'venta-septiembre-devolucion',
    numero: 1004,
    totalCents: -500,
    createdAt: localIso(2026, 9, 3, 10),
  });

  await insertLinea(dataSource, {
    id: 4,
    publicId: 'linea-septiembre-devolucion',
    idVenta: 4,
    idArticulo: 3,
    idMarcaSnapshot: 2,
    localizador: 1003,
    marca: 'Beta histórica',
    nombreArticulo: 'Devolución histórica',
    pucMicros: 2_000_000,
    pvpMicros: 5_000_000,
    importeMicros: -5_000_000,
    unidades: -1,
  });

  await insertVenta(dataSource, {
    id: 5,
    publicId: 'venta-septiembre-directa',
    numero: 1005,
    totalCents: 1000,
    createdAt: localIso(2026, 9, 4, 10),
  });

  await insertLinea(dataSource, {
    id: 5,
    publicId: 'linea-septiembre-directa',
    idVenta: 5,
    idArticulo: 4,
    idMarcaSnapshot: 2,
    localizador: 1004,
    marca: 'Beta histórica',
    nombreArticulo: 'Directo histórico',
    pucMicros: 7_000_000,
    pvpMicros: 10_000_000,
    importeMicros: 10_000_000,
    unidades: 1,
  });

  /*
   * Rama externa a la seleccionada.
   */
  await insertVenta(dataSource, {
    id: 6,
    publicId: 'venta-septiembre-externa',
    numero: 1006,
    totalCents: 5000,
    createdAt: localIso(2026, 9, 5, 10),
  });

  await insertLinea(dataSource, {
    id: 6,
    publicId: 'linea-septiembre-externa',
    idVenta: 6,
    idArticulo: 5,
    idMarcaSnapshot: 1,
    localizador: 1005,
    marca: 'Alpha histórica',
    nombreArticulo: 'Externo histórico',
    pucMicros: 5_000_000,
    pvpMicros: 10_000_000,
    importeMicros: 50_000_000,
    unidades: 5,
  });

  /*
   * Categoría actualmente eliminada.
   */
  await insertVenta(dataSource, {
    id: 7,
    publicId: 'venta-septiembre-eliminada',
    numero: 1007,
    totalCents: 4000,
    createdAt: localIso(2026, 9, 6, 10),
  });

  await insertLinea(dataSource, {
    id: 7,
    publicId: 'linea-septiembre-eliminada',
    idVenta: 7,
    idArticulo: 6,
    idMarcaSnapshot: 1,
    localizador: 1006,
    marca: 'Alpha histórica',
    nombreArticulo: 'Eliminada histórica',
    pucMicros: 5_000_000,
    pvpMicros: 10_000_000,
    importeMicros: 40_000_000,
    unidades: 4,
  });

  /*
   * Venta borrada: tampoco debe computar.
   */
  const deletedAt: string = localIso(2026, 9, 7, 11);

  await insertVenta(dataSource, {
    id: 8,
    publicId: 'venta-septiembre-borrada',
    numero: 1008,
    totalCents: 10000,
    createdAt: localIso(2026, 9, 7, 10),
    deletedAt,
  });

  await insertLinea(dataSource, {
    id: 8,
    publicId: 'linea-septiembre-borrada',
    idVenta: 8,
    idArticulo: 1,
    idMarcaSnapshot: 1,
    localizador: 1001,
    marca: 'Alpha histórica',
    nombreArticulo: 'Multi histórico',
    pucMicros: 0,
    pvpMicros: 100_000_000,
    importeMicros: 100_000_000,
    unidades: 1,
  });

  /*
   * Año anterior: no debe entrar en Todos/2026.
   */
  await insertVenta(dataSource, {
    id: 9,
    publicId: 'venta-2025',
    numero: 9001,
    totalCents: 3000,
    createdAt: localIso(2025, 5, 10, 10),
  });

  await insertLinea(dataSource, {
    id: 9,
    publicId: 'linea-2025',
    idVenta: 9,
    idArticulo: 2,
    idMarcaSnapshot: 2,
    localizador: 1002,
    marca: 'Beta histórica',
    nombreArticulo: 'Profundo histórico',
    pucMicros: 15_000_000,
    pvpMicros: 30_000_000,
    importeMicros: 30_000_000,
    unidades: 1,
  });
}

/**
 * Inserta una venta de prueba.
 */
async function insertVenta(dataSource: DataSource, seed: VentaSeed): Promise<void> {
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
        deleted_at
      )
      VALUES (
        ?, ?, 1, 1, ?, ?, ?, ?
      )
    `,
    [seed.id, seed.publicId, seed.numero, seed.totalCents, seed.createdAt, seed.deletedAt ?? null],
  );
}

/**
 * Inserta una línea histórica de prueba.
 */
async function insertLinea(dataSource: DataSource, seed: LineaSeed): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO linea_venta (
        id,
        public_id,
        id_venta,
        id_articulo,
        id_marca_snapshot,
        localizador,
        marca,
        nombre_articulo,
        puc_micros,
        pvp_micros,
        importe_micros,
        unidades
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
    [
      seed.id,
      seed.publicId,
      seed.idVenta,
      seed.idArticulo,
      seed.idMarcaSnapshot,
      seed.localizador,
      seed.marca,
      seed.nombreArticulo,
      seed.pucMicros,
      seed.pvpMicros,
      seed.importeMicros,
      seed.unidades,
    ],
  );
}

/**
 * Construye un timestamp ISO desde una fecha civil local.
 */
function localIso(year: number, month: number, day: number, hour: number): string {
  const date: Date = new Date();

  date.setFullYear(year, month - 1, day);

  date.setHours(hour, 0, 0, 0);

  return date.toISOString();
}

/**
 * Obtiene el servicio inicializado.
 */
function requireService(): InformeVentasService {
  if (service === null) {
    throw new Error('El servicio de Informe Ventas no está inicializado.');
  }

  return service;
}

/**
 * Obtiene la categoría raíz del resultado.
 */
function requireCategoria(result: InformeVentasResultado): InformeVentasCategoria {
  if (result.categoria === null) {
    throw new Error('El informe no contiene la categoría esperada.');
  }

  return result.categoria;
}

/**
 * Obtiene una subcategoría directa por nombre.
 */
function requireSubcategoria(
  categoria: InformeVentasCategoria,
  nombre: string,
): InformeVentasCategoria {
  const result: InformeVentasCategoria | undefined = categoria.subcategorias.find(
    (item: InformeVentasCategoria): boolean => item.nombre === nombre,
  );

  if (result === undefined) {
    throw new Error(`No se ha encontrado la subcategoría "${nombre}".`);
  }

  return result;
}
