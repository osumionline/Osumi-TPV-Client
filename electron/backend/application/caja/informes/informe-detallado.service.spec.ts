import InformeDetalladoService from '@backend/application/caja/informes/informe-detallado.service';
import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import type {
  InformeDetalladoArticulo,
  InformeDetalladoMarca,
  InformeDetalladoResultado,
} from '@desktop-contracts/caja/informes/informe-detallado.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmInformeDetalladoRepository from '@infrastructure/database/typeorm/caja/informes/typeorm-informe-detallado.repository';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let service: InformeDetalladoService | null = null;

describe('InformeDetalladoService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-informe-detallado-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'informe-detallado.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedInformeDetallado(dataSource);

    service = new InformeDetalladoService(
      new TypeOrmInformeDetalladoRepository(applicationDatabase),
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

  it('calcula ventas y margen ponderado comparando con el mes anterior', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
    });

    expect(result.ventas).toEqual({
      numeroVentas: 3,
      numeroVentasAnterior: 2,
      diferenciaNumeroVentas: 1,

      /*
       * Septiembre:
       * PVP = 55 €
       * beneficio = 23 €
       * margen = 41,818... %
       */
      margenBps: 4182,

      /*
       * Agosto:
       * PVP = 30 €
       * beneficio = 9 €
       * margen = 30 %
       */
      margenAnteriorBps: 3000,

      diferenciaMargenBps: 1182,
    });
  });

  it('incluye todas las marcas y calcula margen e incremento ponderados', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
    });

    expect(result.marcas).toHaveLength(3);

    const alpha: InformeDetalladoMarca = requireMarca(result, 'marca-alpha');

    expect(alpha).toEqual({
      marcaPublicId: 'marca-alpha',
      nombre: 'Alpha',

      totalVentasPvpMicros: 35_000_000,

      totalBeneficioMicros: 18_000_000,

      margenBps: 5143,
      margenAnteriorBps: 4000,
      diferenciaMargenBps: 1143,

      porcentajeVentasBps: 6364,
    });

    const beta: InformeDetalladoMarca = requireMarca(result, 'marca-beta');

    expect(beta).toMatchObject({
      totalVentasPvpMicros: 20_000_000,

      totalBeneficioMicros: 5_000_000,

      margenBps: 2500,
      margenAnteriorBps: 2500,
      diferenciaMargenBps: 0,

      porcentajeVentasBps: 3636,
    });

    const gamma: InformeDetalladoMarca = requireMarca(result, 'marca-gamma');

    expect(gamma).toMatchObject({
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
      margenBps: 0,
      margenAnteriorBps: 0,
      diferenciaMargenBps: 0,
      porcentajeVentasBps: 0,
    });

    expect(result.marcasTotales).toEqual({
      totalVentasPvpMicros: 55_000_000,

      totalBeneficioMicros: 23_000_000,

      margenBps: 4182,
    });
  });

  it('calcula Top artículos, penetración por tickets y margen anterior', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
    });

    expect(
      result.articulos.map(
        (articulo: InformeDetalladoArticulo): string => articulo.articuloPublicId ?? '',
      ),
    ).toEqual(['articulo-a', 'articulo-b', 'articulo-c']);

    const articleA: InformeDetalladoArticulo = requireArticulo(result, 'articulo-a');

    expect(articleA).toEqual({
      idArticulo: 1,
      articuloPublicId: 'articulo-a',
      marca: 'Alpha',
      nombre: 'Artículo A',

      totalUnidadesVendidas: 3,

      totalVentasPvpMicros: 30_000_000,

      totalBeneficioMicros: 15_000_000,

      margenBps: 5000,
      margenAnteriorBps: 4000,
      diferenciaMargenBps: 1000,

      /*
       * Aparece en 2 de los 3 tickets.
       */
      porcentajeVentasBps: 6667,
    });

    const articleC: InformeDetalladoArticulo = requireArticulo(result, 'articulo-c');

    expect(articleC).toMatchObject({
      margenBps: 6000,
      margenAnteriorBps: null,
      diferenciaMargenBps: null,

      /*
       * Aparece en 1 de 3 tickets.
       */
      porcentajeVentasBps: 3333,
    });

    /*
     * El footer suma únicamente
     * los artículos del Top 50 mostrado.
     */
    expect(result.articulosTotales).toEqual({
      totalUnidadesVendidas: 5,

      totalVentasPvpMicros: 55_000_000,

      totalBeneficioMicros: 23_000_000,
    });
  });

  it('excluye ventas borradas de todos los agregados', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
    });

    expect(result.ventas.numeroVentas).toBe(3);

    expect(result.marcasTotales.totalVentasPvpMicros).toBe(55_000_000);

    expect(result.articulosTotales.totalVentasPvpMicros).toBe(55_000_000);
  });

  it('mantiene las marcas aunque el periodo no tenga ventas', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 10,
    });

    expect(result.ventas.numeroVentas).toBe(0);

    expect(result.marcas).toHaveLength(3);

    expect(result.articulos).toEqual([]);

    expect(result.articulosTotales).toEqual({
      totalUnidadesVendidas: 0,
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
    });
  });

  it('compara Todos con el año natural anterior completo', async (): Promise<void> => {
    const result: InformeDetalladoResultado = await requireService().getInforme({
      year: 2026,
      month: 'todos',
    });

    /*
     * Agosto + septiembre de 2026.
     */
    expect(result.ventas.numeroVentas).toBe(5);

    /*
     * Una venta de 2025.
     */
    expect(result.ventas.numeroVentasAnterior).toBe(1);

    expect(result.ventas.diferenciaNumeroVentas).toBe(4);
  });
});

/**
 * Crea todas las tablas del esquema actual.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta un escenario controlado para validar
 * las fórmulas del Informe Detallado.
 */
async function seedInformeDetallado(dataSource: DataSource): Promise<void> {
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
        'Alpha'
      ),
      (
        2,
        'marca-beta',
        'Beta'
      ),
      (
        3,
        'marca-gamma',
        'Gamma'
      )
  `);

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
        'articulo-a',
        1001,
        'Artículo A',
        'articulo-a',
        1
      ),
      (
        2,
        'articulo-b',
        1002,
        'Artículo B',
        'articulo-b',
        2
      ),
      (
        3,
        'articulo-c',
        1003,
        'Artículo C',
        'articulo-c',
        1
      )
  `);

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
      VALUES
        (
          1,
          'venta-agosto-a',
          1,
          1,
          1001,
          1000,
          ?,
          NULL
        ),
        (
          2,
          'venta-agosto-b',
          1,
          1,
          1002,
          2000,
          ?,
          NULL
        ),
        (
          3,
          'venta-septiembre-ab',
          1,
          1,
          1003,
          4000,
          ?,
          NULL
        ),
        (
          4,
          'venta-septiembre-a',
          1,
          1,
          1004,
          1000,
          ?,
          NULL
        ),
        (
          5,
          'venta-septiembre-c',
          1,
          1,
          1005,
          500,
          ?,
          NULL
        ),
        (
          6,
          'venta-septiembre-borrada',
          1,
          1,
          1006,
          10000,
          ?,
          ?
        ),
        (
          7,
          'venta-2025',
          1,
          1,
          9001,
          1000,
          ?,
          NULL
        )
    `,
    [
      localIso(2026, 8, 5, 10),
      localIso(2026, 8, 6, 10),
      localIso(2026, 9, 1, 10),
      localIso(2026, 9, 2, 10),
      localIso(2026, 9, 3, 10),
      localIso(2026, 9, 4, 10),
      localIso(2026, 9, 4, 11),
      localIso(2025, 4, 10, 10),
    ],
  );

  await dataSource.query(`
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
    VALUES
      (
        1,
        'linea-agosto-a',
        1,
        1,
        1,
        1001,
        'Alpha',
        'Artículo A',
        6000000,
        10000000,
        10000000,
        1
      ),
      (
        2,
        'linea-agosto-b',
        2,
        2,
        2,
        1002,
        'Beta',
        'Artículo B',
        15000000,
        20000000,
        20000000,
        1
      ),

      /*
       * Septiembre:
       * A = 2 unidades × 10 €, PUC 5 €.
       */
      (
        3,
        'linea-septiembre-a-1',
        3,
        1,
        1,
        1001,
        'Alpha',
        'Artículo A',
        5000000,
        10000000,
        20000000,
        2
      ),

      /*
       * B = 1 unidad × 20 €, PUC 15 €.
       */
      (
        4,
        'linea-septiembre-b',
        3,
        2,
        2,
        1002,
        'Beta',
        'Artículo B',
        15000000,
        20000000,
        20000000,
        1
      ),

      /*
       * A vuelve a aparecer en otro ticket.
       */
      (
        5,
        'linea-septiembre-a-2',
        4,
        1,
        1,
        1001,
        'Alpha',
        'Artículo A',
        5000000,
        10000000,
        10000000,
        1
      ),

      /*
       * C = 5 € PVP, 2 € PUC.
       */
      (
        6,
        'linea-septiembre-c',
        5,
        3,
        1,
        1003,
        'Alpha',
        'Artículo C',
        2000000,
        5000000,
        5000000,
        1
      ),

      /*
       * Debe quedar completamente excluida.
       */
      (
        7,
        'linea-borrada',
        6,
        3,
        1,
        1003,
        'Alpha',
        'Artículo C',
        0,
        100000000,
        100000000,
        1
      ),

      /*
       * Venta del año comparable.
       */
      (
        8,
        'linea-2025',
        7,
        1,
        1,
        1001,
        'Alpha',
        'Artículo A',
        8000000,
        10000000,
        10000000,
        1
      )
  `);
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
 * Obtiene una marca del resultado por su public id.
 */
function requireMarca(result: InformeDetalladoResultado, publicId: string): InformeDetalladoMarca {
  const marca: InformeDetalladoMarca | undefined = result.marcas.find(
    (item: InformeDetalladoMarca): boolean => item.marcaPublicId === publicId,
  );

  if (marca === undefined) {
    throw new Error(`No se ha encontrado la marca "${publicId}".`);
  }

  return marca;
}

/**
 * Obtiene un artículo del resultado por su public id.
 */
function requireArticulo(
  result: InformeDetalladoResultado,
  publicId: string,
): InformeDetalladoArticulo {
  const articulo: InformeDetalladoArticulo | undefined = result.articulos.find(
    (item: InformeDetalladoArticulo): boolean => item.articuloPublicId === publicId,
  );

  if (articulo === undefined) {
    throw new Error(`No se ha encontrado el artículo "${publicId}".`);
  }

  return articulo;
}

/**
 * Obtiene el servicio inicializado por el test.
 */
function requireService(): InformeDetalladoService {
  if (service === null) {
    throw new Error('El servicio de Informe Detallado no está inicializado.');
  }

  return service;
}
