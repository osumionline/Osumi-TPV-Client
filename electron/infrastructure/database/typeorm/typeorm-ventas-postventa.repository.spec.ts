import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmVentasPostventaRepository from '@infrastructure/database/typeorm/typeorm-ventas-postventa.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface VentaClienteRow {
  readonly cliente_public_id: string | null;
}

interface VentaPagoRow {
  readonly tipo_pago_public_id: string;
  readonly importe_cents: number;
  readonly entregado_cents: number | null;
  readonly cambio_cents: number;
}

interface CajaRow {
  readonly ventas_cents: number;
  readonly beneficios_cents: number;
  readonly descuentos_cents: number;
  readonly importe_cierre_teorico_cents: number;
}

interface CajaTipoRow {
  readonly slug: string;
  readonly operaciones: number;
  readonly importe_total_cents: number;
  readonly importe_descuento_cents: number;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmVentasPostventaRepository | null = null;

describe('TypeOrmVentasPostventaRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-postventa-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'postventa.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedBaseData(dataSource);

    repository = new TypeOrmVentasPostventaRepository(applicationDatabase);
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

  it('cambia el cliente de una venta no facturada', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-cliente-1',
      clientePublicId: 'cliente-1',
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-tarjeta',
      entregadoCents: null,
      cierreTeoricoCents: 0,
    });

    await requireRepository().cambiarCliente(idVenta, 'cliente-2');

    const venta: VentaClienteRow = await queryOne<VentaClienteRow>(
      dataSource,
      `
        SELECT
          c.public_id AS cliente_public_id
        FROM venta v
        LEFT JOIN cliente c
          ON c.id = v.id_cliente
        WHERE v.id = ?
      `,
      [idVenta],
    );

    expect(venta.cliente_public_id).toBe('cliente-2');

    await requireRepository().cambiarCliente(idVenta, null);

    const ventaSinCliente: VentaClienteRow = await queryOne<VentaClienteRow>(
      dataSource,
      `
          SELECT
            c.public_id AS cliente_public_id
          FROM venta v
          LEFT JOIN cliente c
            ON c.id = v.id_cliente
          WHERE v.id = ?
        `,
      [idVenta],
    );

    expect(ventaSinCliente.cliente_public_id).toBeNull();
  });

  it('rechaza cambiar el cliente de una venta facturada', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-facturada-1',
      clientePublicId: 'cliente-1',
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-tarjeta',
      entregadoCents: null,
      cierreTeoricoCents: 0,
    });

    await seedFactura(dataSource, idVenta);

    await expect(requireRepository().cambiarCliente(idVenta, 'cliente-2')).rejects.toThrow(
      'No se puede cambiar el cliente de una venta incluida en una factura.',
    );

    const venta: VentaClienteRow = await queryOne<VentaClienteRow>(
      dataSource,
      `
        SELECT
          c.public_id AS cliente_public_id
        FROM venta v
        LEFT JOIN cliente c
          ON c.id = v.id_cliente
        WHERE v.id = ?
      `,
      [idVenta],
    );

    expect(venta.cliente_public_id).toBe('cliente-1');
  });

  it('cambia efectivo por tarjeta y retira el impacto del cierre teórico', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-efectivo-tarjeta-1',
      clientePublicId: null,
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-efectivo',
      entregadoCents: 2_000,
      cambioCents: 200,
      cierreTeoricoCents: 1_800,
    });

    await requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-tarjeta');

    expect(await getPago(dataSource, idVenta)).toEqual({
      tipo_pago_public_id: 'tipo-pago-tarjeta',
      importe_cents: 1_800,
      entregado_cents: null,
      cambio_cents: 0,
    });

    expect(await getCaja(dataSource)).toEqual({
      ventas_cents: 1_800,
      beneficios_cents: 1_000,
      descuentos_cents: 200,
      importe_cierre_teorico_cents: 0,
    });

    expect(await getCajaTipos(dataSource)).toEqual([
      {
        slug: 'efectivo',
        operaciones: 0,
        importe_total_cents: 0,
        importe_descuento_cents: 0,
      },
      {
        slug: 'tarjeta',
        operaciones: 1,
        importe_total_cents: 1_800,
        importe_descuento_cents: 200,
      },
    ]);
  });

  it('cambia tarjeta por efectivo y normaliza el importe entregado', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-tarjeta-efectivo-1',
      clientePublicId: null,
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-tarjeta',
      entregadoCents: null,
      cierreTeoricoCents: 0,
    });

    await requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-efectivo');

    expect(await getPago(dataSource, idVenta)).toEqual({
      tipo_pago_public_id: 'tipo-pago-efectivo',
      importe_cents: 1_800,
      entregado_cents: 1_800,
      cambio_cents: 0,
    });

    expect((await getCaja(dataSource)).importe_cierre_teorico_cents).toBe(1_800);

    expect(await getCajaTipos(dataSource)).toEqual([
      {
        slug: 'efectivo',
        operaciones: 1,
        importe_total_cents: 1_800,
        importe_descuento_cents: 200,
      },
      {
        slug: 'tarjeta',
        operaciones: 0,
        importe_total_cents: 0,
        importe_descuento_cents: 0,
      },
    ]);
  });

  it('cambia una devolución a efectivo sin generar entregado ni cambio', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-devolucion-1',
      clientePublicId: null,
      totalCents: -1_800,
      tipoPagoPublicId: 'tipo-pago-tarjeta',
      entregadoCents: null,
      cierreTeoricoCents: 0,
      unidades: -2,
      importeMicros: -18_000_000,
      importeDescuentoMicros: 2_000_000,
    });

    await requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-efectivo');

    expect(await getPago(dataSource, idVenta)).toEqual({
      tipo_pago_public_id: 'tipo-pago-efectivo',
      importe_cents: -1_800,
      entregado_cents: null,
      cambio_cents: 0,
    });

    expect((await getCaja(dataSource)).importe_cierre_teorico_cents).toBe(-1_800);

    expect(await getCajaTipos(dataSource)).toEqual([
      {
        slug: 'efectivo',
        operaciones: 1,
        importe_total_cents: -1_800,
        importe_descuento_cents: -200,
      },
      {
        slug: 'tarjeta',
        operaciones: 0,
        importe_total_cents: 0,
        importe_descuento_cents: 0,
      },
    ]);
  });

  it('rechaza el cambio cuando la venta tiene pagos múltiples', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-multipago-1',
      clientePublicId: null,
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-efectivo',
      importePagoCents: 1_000,
      entregadoCents: 1_000,
      cierreTeoricoCents: 1_000,
    });

    await insertPago(dataSource, idVenta, 'pago-multipago-2', 'tipo-pago-tarjeta', 1, 800, null, 0);

    await expect(requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-tarjeta')).rejects.toThrow(
      'Solo se puede cambiar el tipo de pago de una venta con un único pago.',
    );

    const caja: CajaRow = await getCaja(dataSource);

    expect(caja.importe_cierre_teorico_cents).toBe(1_000);
  });

  it('rechaza el cambio cuando la caja original ya está cerrada', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-caja-cerrada-1',
      clientePublicId: null,
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-efectivo',
      entregadoCents: 1_800,
      cierreTeoricoCents: 1_800,
    });

    await dataSource.query(
      `
        UPDATE caja
        SET cierre = '2026-08-25T17:00:00.000Z'
        WHERE public_id = 'caja-1'
      `,
    );

    await expect(requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-tarjeta')).rejects.toThrow(
      'No se puede cambiar el tipo de pago porque la caja original ya está cerrada.',
    );

    expect(await getPago(dataSource, idVenta)).toEqual({
      tipo_pago_public_id: 'tipo-pago-efectivo',
      importe_cents: 1_800,
      entregado_cents: 1_800,
      cambio_cents: 0,
    });
  });

  it('hace rollback completo si falla después de retirar el impacto anterior', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    const idVenta: number = await seedVenta(dataSource, {
      publicId: 'venta-rollback-1',
      clientePublicId: null,
      totalCents: 1_800,
      tipoPagoPublicId: 'tipo-pago-efectivo',
      entregadoCents: 1_800,
      cierreTeoricoCents: 1_800,
    });

    await dataSource.query(
      `
        UPDATE caja_tipo
        SET operaciones = ?
        WHERE
          id_caja = (
            SELECT id
            FROM caja
            WHERE public_id = 'caja-1'
          )
          AND id_tipo_pago = (
            SELECT id
            FROM tipo_pago
            WHERE public_id = 'tipo-pago-tarjeta'
          )
      `,
      [Number.MAX_SAFE_INTEGER],
    );

    await expect(requireRepository().cambiarTipoPago(idVenta, 'tipo-pago-tarjeta')).rejects.toThrow(
      'El número de operaciones del nuevo tipo de pago supera el rango numérico seguro.',
    );

    expect(await getPago(dataSource, idVenta)).toEqual({
      tipo_pago_public_id: 'tipo-pago-efectivo',
      importe_cents: 1_800,
      entregado_cents: 1_800,
      cambio_cents: 0,
    });

    expect((await getCaja(dataSource)).importe_cierre_teorico_cents).toBe(1_800);

    const cajaTipos: readonly CajaTipoRow[] = await getCajaTipos(dataSource);

    expect(cajaTipos).toEqual([
      {
        slug: 'efectivo',
        operaciones: 1,
        importe_total_cents: 1_800,
        importe_descuento_cents: 200,
      },
      {
        slug: 'tarjeta',
        operaciones: Number.MAX_SAFE_INTEGER,
        importe_total_cents: 0,
        importe_descuento_cents: 0,
      },
    ]);
  });
});

/**
 * Crea el esquema SQLite real de la aplicación.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('PRAGMA foreign_keys = ON');

  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Crea las referencias mínimas comunes a los tests de postventa.
 */
async function seedBaseData(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      public_id,
      nombre,
      codigo
    )
    VALUES (
      'terminal-1',
      'Terminal test',
      'TEST-1'
    )
  `);

  await dataSource.query(`
    INSERT INTO empleado (
      public_id,
      nombre,
      password_hash,
      password_algorithm,
      color,
      admin,
      activo
    )
    VALUES (
      'empleado-1',
      'Empleado test',
      'hash-test',
      'scrypt',
      'FFFFFF',
      1,
      1
    )
  `);

  await dataSource.query(`
    INSERT INTO cliente (
      public_id,
      nombre_apellidos
    )
    VALUES
      ('cliente-1', 'Cliente uno'),
      ('cliente-2', 'Cliente dos')
  `);

  await dataSource.query(`
    INSERT INTO tipo_pago (
      public_id,
      nombre,
      slug,
      afecta_caja,
      orden,
      fisico,
      activo
    )
    VALUES
      (
        'tipo-pago-efectivo',
        'Efectivo',
        'efectivo',
        1,
        1,
        1,
        1
      ),
      (
        'tipo-pago-tarjeta',
        'Tarjeta',
        'tarjeta',
        0,
        2,
        1,
        1
      )
  `);

  await dataSource.query(`
    INSERT INTO caja (
      public_id,
      id_terminal,
      id_empleado_apertura,
      apertura
    )
    VALUES (
      'caja-1',
      (
        SELECT id
        FROM terminal
        WHERE public_id = 'terminal-1'
      ),
      (
        SELECT id
        FROM empleado
        WHERE public_id = 'empleado-1'
      ),
      '2026-08-25T08:00:00.000Z'
    )
  `);

  await dataSource.query(`
    INSERT INTO caja_tipo (
      id_caja,
      id_tipo_pago
    )
    SELECT
      c.id,
      tp.id
    FROM caja c
    CROSS JOIN tipo_pago tp
    WHERE c.public_id = 'caja-1'
  `);
}

/**
 * Crea una venta con una línea descontada y un pago inicial.
 */
async function seedVenta(
  dataSource: DataSource,
  options: {
    readonly publicId: string;
    readonly clientePublicId: string | null;
    readonly totalCents: number;
    readonly tipoPagoPublicId: string;
    readonly entregadoCents: number | null;
    readonly cierreTeoricoCents: number;
    readonly cambioCents?: number;
    readonly importePagoCents?: number;
    readonly unidades?: number;
    readonly importeMicros?: number;
    readonly importeDescuentoMicros?: number;
  },
): Promise<number> {
  const importePagoCents: number = options.importePagoCents ?? options.totalCents;

  const unidades: number = options.unidades ?? 2;
  const importeMicros: number = options.importeMicros ?? 18_000_000;
  const importeDescuentoMicros: number = options.importeDescuentoMicros ?? 2_000_000;

  await dataSource.query(
    `
      INSERT INTO venta (
        public_id,
        id_caja,
        id_empleado,
        id_cliente,
        serie,
        numero,
        total_cents
      )
      VALUES (
        ?,
        (
          SELECT id
          FROM caja
          WHERE public_id = 'caja-1'
        ),
        (
          SELECT id
          FROM empleado
          WHERE public_id = 'empleado-1'
        ),
        (
          SELECT id
          FROM cliente
          WHERE public_id = ?
        ),
        '',
        (
          SELECT COALESCE(MAX(numero), 0) + 1
          FROM venta
        ),
        ?
      )
    `,
    [options.publicId, options.clientePublicId, options.totalCents],
  );

  const idVenta: number = await getVentaId(dataSource, options.publicId);

  await dataSource.query(
    `
      INSERT INTO linea_venta (
        public_id,
        id_venta,
        localizador,
        marca,
        nombre_articulo,
        pvp_micros,
        importe_micros,
        descuento_bps,
        importe_descuento_micros,
        unidades,
        regalo
      )
      VALUES (
        ?,
        ?,
        1,
        'Marca test',
        'Artículo test',
        10000000,
        ?,
        0,
        ?,
        ?,
        0
      )
    `,
    [`linea-${options.publicId}`, idVenta, importeMicros, importeDescuentoMicros, unidades],
  );

  await insertPago(
    dataSource,
    idVenta,
    `pago-${options.publicId}`,
    options.tipoPagoPublicId,
    0,
    importePagoCents,
    options.entregadoCents,
    options.cambioCents ?? 0,
  );

  const descuentoCents: number = unidades < 0 ? -200 : 200;

  await dataSource.query(
    `
      UPDATE caja
      SET
        ventas_cents = ?,
        beneficios_cents = ?,
        descuentos_cents = ?,
        importe_cierre_teorico_cents = ?
      WHERE public_id = 'caja-1'
    `,
    [
      options.totalCents,
      options.totalCents >= 0 ? 1_000 : -1_000,
      descuentoCents,
      options.cierreTeoricoCents,
    ],
  );

  await dataSource.query(
    `
      UPDATE caja_tipo
      SET
        operaciones = 1,
        importe_total_cents = ?,
        importe_descuento_cents = ?
      WHERE
        id_caja = (
          SELECT id
          FROM caja
          WHERE public_id = 'caja-1'
        )
        AND id_tipo_pago = (
          SELECT id
          FROM tipo_pago
          WHERE public_id = ?
        )
    `,
    [importePagoCents, descuentoCents, options.tipoPagoPublicId],
  );

  return idVenta;
}

/**
 * Añade un pago persistido a una venta.
 */
async function insertPago(
  dataSource: DataSource,
  idVenta: number,
  publicId: string,
  tipoPagoPublicId: string,
  orden: number,
  importeCents: number,
  entregadoCents: number | null,
  cambioCents: number,
): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO venta_pago (
        public_id,
        id_venta,
        id_tipo_pago,
        orden,
        importe_cents,
        entregado_cents,
        cambio_cents
      )
      VALUES (
        ?,
        ?,
        (
          SELECT id
          FROM tipo_pago
          WHERE public_id = ?
        ),
        ?,
        ?,
        ?,
        ?
      )
    `,
    [publicId, idVenta, tipoPagoPublicId, orden, importeCents, entregadoCents, cambioCents],
  );
}

/**
 * Marca una venta como incluida en una factura.
 */
async function seedFactura(dataSource: DataSource, idVenta: number): Promise<void> {
  await dataSource.query(`
    INSERT INTO factura (
      public_id,
      id_cliente,
      nombre_apellidos
    )
    VALUES (
      'factura-1',
      (
        SELECT id
        FROM cliente
        WHERE public_id = 'cliente-1'
      ),
      'Cliente uno'
    )
  `);

  await dataSource.query(
    `
      INSERT INTO factura_venta (
        id_factura,
        id_venta
      )
      VALUES (
        (
          SELECT id
          FROM factura
          WHERE public_id = 'factura-1'
        ),
        ?
      )
    `,
    [idVenta],
  );
}

/**
 * Recupera el ID interno de una venta creada por el test.
 */
async function getVentaId(dataSource: DataSource, publicId: string): Promise<number> {
  const row: { readonly id: number } = await queryOne<{
    readonly id: number;
  }>(
    dataSource,
    `
      SELECT id
      FROM venta
      WHERE public_id = ?
    `,
    [publicId],
  );

  return row.id;
}

/**
 * Recupera el pago persistido de una venta.
 */
async function getPago(dataSource: DataSource, idVenta: number): Promise<VentaPagoRow> {
  return queryOne<VentaPagoRow>(
    dataSource,
    `
      SELECT
        tp.public_id AS tipo_pago_public_id,
        vp.importe_cents,
        vp.entregado_cents,
        vp.cambio_cents
      FROM venta_pago vp
      INNER JOIN tipo_pago tp
        ON tp.id = vp.id_tipo_pago
      WHERE vp.id_venta = ?
      ORDER BY vp.orden, vp.id
      LIMIT 1
    `,
    [idVenta],
  );
}

/**
 * Recupera los acumulados generales de la caja de test.
 */
async function getCaja(dataSource: DataSource): Promise<CajaRow> {
  return queryOne<CajaRow>(
    dataSource,
    `
      SELECT
        ventas_cents,
        beneficios_cents,
        descuentos_cents,
        importe_cierre_teorico_cents
      FROM caja
      WHERE public_id = 'caja-1'
    `,
  );
}

/**
 * Recupera los acumulados por medio de pago.
 */
async function getCajaTipos(dataSource: DataSource): Promise<readonly CajaTipoRow[]> {
  return queryRows<CajaTipoRow>(
    dataSource,
    `
      SELECT
        tp.slug,
        ct.operaciones,
        ct.importe_total_cents,
        ct.importe_descuento_cents
      FROM caja_tipo ct
      INNER JOIN tipo_pago tp
        ON tp.id = ct.id_tipo_pago
      WHERE ct.id_caja = (
        SELECT id
        FROM caja
        WHERE public_id = 'caja-1'
      )
      ORDER BY tp.slug
    `,
  );
}

/**
 * Devuelve la base SQLite inicializada para el test actual.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de postventa de test no está inicializada.');
  }

  return applicationDatabase;
}

/**
 * Devuelve el repository inicializado para el test actual.
 */
function requireRepository(): TypeOrmVentasPostventaRepository {
  if (repository === null) {
    throw new Error('El repository de postventa de test no está inicializado.');
  }

  return repository;
}

/**
 * Recupera obligatoriamente la primera fila de una consulta.
 */
async function queryOne<T>(
  dataSource: DataSource,
  sql: string,
  parameters: readonly unknown[] = [],
): Promise<T> {
  const rows: readonly T[] = await queryRows<T>(dataSource, sql, parameters);

  const row: T | undefined = rows[0];

  if (row === undefined) {
    throw new Error('La consulta de postventa de test no ha devuelto ninguna fila.');
  }

  return row;
}

/**
 * Ejecuta una consulta tipada sobre la SQLite de test.
 */
async function queryRows<T>(
  dataSource: DataSource,
  sql: string,
  parameters: readonly unknown[] = [],
): Promise<readonly T[]> {
  return (await dataSource.query(sql, [...parameters])) as readonly T[];
}
