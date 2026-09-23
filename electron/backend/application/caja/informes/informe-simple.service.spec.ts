import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import InformeSimpleService from '@backend/application/caja/informes/informe-simple.service';
import type {
  InformeSimpleImporteTipoPago,
  InformeSimpleItem,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmInformeSimpleRepository from '@infrastructure/database/typeorm/caja/informes/typeorm-informe-simple.repository';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let service: InformeSimpleService | null = null;

describe('InformeSimpleService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-informe-simple-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'informe-simple.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedInformeSimple(dataSource);

    service = new InformeSimpleService(
      new TypeOrmInformeSimpleRepository(applicationDatabase),
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

  it('genera todos los días del mes y acumula ventas y pagos mixtos', async (): Promise<void> => {
    const result: InformeSimpleResultado = await requireService().getInforme({
      year: 2026,
      month: 9,
    });

    expect(result.granularidad).toBe('dia');

    expect(result.items).toHaveLength(30);

    expect(result.tiposPago.map((tipoPago): string => tipoPago.slug)).toEqual([
      'efectivo',
      'visa',
      'bizum',
    ]);

    const day1: InformeSimpleItem = requireItem(result, 9, 1);

    expect(day1).toMatchObject({
      year: 2026,
      month: 9,
      day: 1,
      numeroVentas: 1,
      primerTicket: {
        serie: '',
        numero: 9486,
      },
      ultimoTicket: {
        serie: '',
        numero: 9486,
      },
      totalCents: 2_000,
      sumaCents: 2_000,
    });

    expect(getTipoPagoImporte(day1, 'tipo-pago-efectivo')).toBe(500);

    expect(getTipoPagoImporte(day1, 'tipo-pago-visa')).toBe(1_500);

    const day2: InformeSimpleItem = requireItem(result, 9, 2);

    expect(day2).toMatchObject({
      numeroVentas: 1,
      totalCents: -500,
      sumaCents: 1_500,
    });

    expect(getTipoPagoImporte(day2, 'tipo-pago-visa')).toBe(-500);

    const day3: InformeSimpleItem = requireItem(result, 9, 3);

    expect(day3).toMatchObject({
      numeroVentas: 0,
      primerTicket: null,
      ultimoTicket: null,
      totalCents: 0,
      sumaCents: 1_500,
    });

    const day15: InformeSimpleItem = requireItem(result, 9, 15);

    expect(day15).toMatchObject({
      numeroVentas: 1,
      totalCents: 300,
      sumaCents: 1_800,
    });

    /*
     * Bizum está actualmente inactivo, pero se conserva
     * porque fue realmente utilizado históricamente.
     */
    expect(getTipoPagoImporte(day15, 'tipo-pago-bizum')).toBe(300);

    expect(result.totales).toMatchObject({
      numeroVentas: 3,
      primerTicket: {
        serie: '',
        numero: 9486,
      },
      ultimoTicket: {
        serie: '',
        numero: 9488,
      },
      totalCents: 1_800,
      sumaCents: 1_800,
    });

    expect(getTipoPagoImporte(result.totales, 'tipo-pago-efectivo')).toBe(500);

    expect(getTipoPagoImporte(result.totales, 'tipo-pago-visa')).toBe(1_000);

    expect(getTipoPagoImporte(result.totales, 'tipo-pago-bizum')).toBe(300);
  });

  it('genera doce filas mensuales para Todos y mantiene el acumulado anual', async (): Promise<void> => {
    const result: InformeSimpleResultado = await requireService().getInforme({
      year: 2025,
      month: 'todos',
    });

    expect(result.granularidad).toBe('mes');
    expect(result.items).toHaveLength(12);

    const january: InformeSimpleItem = requireItem(result, 1, null);

    expect(january).toMatchObject({
      year: 2025,
      month: 1,
      day: null,
      numeroVentas: 1,
      totalCents: 100,
      sumaCents: 100,
    });

    const february: InformeSimpleItem = requireItem(result, 2, null);

    expect(february).toMatchObject({
      numeroVentas: 0,
      totalCents: 0,
      sumaCents: 100,
    });

    const march: InformeSimpleItem = requireItem(result, 3, null);

    expect(march).toMatchObject({
      numeroVentas: 1,
      totalCents: 200,
      sumaCents: 300,
    });

    const december: InformeSimpleItem = requireItem(result, 12, null);

    expect(december.sumaCents).toBe(300);

    expect(result.totales).toMatchObject({
      numeroVentas: 2,
      totalCents: 300,
      sumaCents: 300,
    });
  });

  it('mantiene Efectivo como columna estructural cuando el periodo no tiene ventas', async (): Promise<void> => {
    const result: InformeSimpleResultado = await requireService().getInforme({
      year: 2026,
      month: 11,
    });

    expect(result.tiposPago.map((tipoPago): string => tipoPago.slug)).toEqual(['efectivo']);

    expect(
      result.items.every(
        (item: InformeSimpleItem): boolean =>
          item.numeroVentas === 0 && item.totalCents === 0 && item.sumaCents === 0,
      ),
    ).toBe(true);

    expect(result.totales).toEqual({
      numeroVentas: 0,
      primerTicket: null,
      ultimoTicket: null,
      importesTipoPago: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          importeCents: 0,
        },
      ],
      totalCents: 0,
      sumaCents: 0,
    });
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
 * Inserta datos representativos del Informe Simple:
 * pagos mixtos, devolución, tipo histórico y venta borrada.
 */
async function seedInformeSimple(dataSource: DataSource): Promise<void> {
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

  await dataSource.query(
    `
    INSERT INTO tipo_pago (
      id,
      public_id,
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
        'tipo-pago-bizum',
        'Bizum',
        'bizum',
        0,
        2,
        1,
        0,
        ?
      )
  `,
    [localIso(2026, 9, 20, 10)],
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
      deleted_at
    )
    VALUES
      (
        1,
        'venta-septiembre-1',
        1,
        1,
        9486,
        2000,
        ?,
        NULL
      ),
      (
        2,
        'venta-septiembre-2',
        1,
        1,
        9487,
        -500,
        ?,
        NULL
      ),
      (
        3,
        'venta-septiembre-15',
        1,
        1,
        9488,
        300,
        ?,
        NULL
      ),
      (
        4,
        'venta-borrada',
        1,
        1,
        9489,
        9999,
        ?,
        ?
      ),
      (
        5,
        'venta-octubre',
        1,
        1,
        9490,
        400,
        ?,
        NULL
      ),
      (
        6,
        'venta-enero-2025',
        1,
        1,
        9001,
        100,
        ?,
        NULL
      ),
      (
        7,
        'venta-marzo-2025',
        1,
        1,
        9002,
        200,
        ?,
        NULL
      )
  `,
    [
      localIso(2026, 9, 1, 10),
      localIso(2026, 9, 2, 10),
      localIso(2026, 9, 15, 10),
      localIso(2026, 9, 3, 10),
      localIso(2026, 9, 3, 11),
      localIso(2026, 10, 1, 10),
      localIso(2025, 1, 10, 10),
      localIso(2025, 3, 10, 10),
    ],
  );

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
        'pago-septiembre-1-efectivo',
        1,
        1,
        0,
        500
      ),
      (
        2,
        'pago-septiembre-1-visa',
        1,
        2,
        1,
        1500
      ),
      (
        3,
        'pago-septiembre-2-visa',
        2,
        2,
        0,
        -500
      ),
      (
        4,
        'pago-septiembre-15-bizum',
        3,
        3,
        0,
        300
      ),
      (
        5,
        'pago-borrado',
        4,
        2,
        0,
        9999
      ),
      (
        6,
        'pago-octubre',
        5,
        2,
        0,
        400
      ),
      (
        7,
        'pago-enero-2025',
        6,
        1,
        0,
        100
      ),
      (
        8,
        'pago-marzo-2025',
        7,
        2,
        0,
        200
      )
  `);
}

/**
 * Construye un timestamp ISO a partir de una fecha
 * civil local para que el test sea independiente
 * de la zona horaria de la máquina.
 */
function localIso(year: number, month: number, day: number, hour: number): string {
  const date: Date = new Date();

  date.setFullYear(year, month - 1, day);
  date.setHours(hour, 0, 0, 0);

  return date.toISOString();
}

/**
 * Obtiene una fila concreta del informe.
 */
function requireItem(
  result: InformeSimpleResultado,
  month: number,
  day: number | null,
): InformeSimpleItem {
  const item: InformeSimpleItem | undefined = result.items.find(
    (candidate: InformeSimpleItem): boolean => candidate.month === month && candidate.day === day,
  );

  if (item === undefined) {
    throw new Error('No se ha encontrado la fila esperada del informe.');
  }

  return item;
}

/**
 * Obtiene el importe de un tipo de pago
 * dentro de una fila o del total.
 */
function getTipoPagoImporte(
  source: {
    readonly importesTipoPago: readonly InformeSimpleImporteTipoPago[];
  },
  tipoPagoPublicId: string,
): number {
  const importe: InformeSimpleImporteTipoPago | undefined = source.importesTipoPago.find(
    (item: InformeSimpleImporteTipoPago): boolean => item.tipoPagoPublicId === tipoPagoPublicId,
  );

  if (importe === undefined) {
    throw new Error(`No se ha encontrado el tipo de pago "${tipoPagoPublicId}".`);
  }

  return importe.importeCents;
}

/**
 * Obtiene el servicio inicializado por el test.
 */
function requireService(): InformeSimpleService {
  if (service === null) {
    throw new Error('El servicio de Informe Simple no está inicializado.');
  }

  return service;
}
