import VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmVentasPersistenciaRepository from '@infrastructure/database/typeorm/typeorm-ventas-persistencia.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface CountRow {
  readonly total: number;
}

interface StockRow {
  readonly stock: number;
}

interface HistoricoRow {
  readonly stock_previo: number;
  readonly diferencia: number;
  readonly stock_final: number;
  readonly puc_micros: number;
  readonly pvp_micros: number;
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

interface SecuenciaRow {
  readonly ultimo_numero: number;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let ventasPersistenciaService: VentasPersistenciaService | null = null;

describe('TypeOrmVentasPersistenciaRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-ventas-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'ventas.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);

    await seedBaseData(dataSource);

    ventasPersistenciaService = new VentasPersistenciaService(
      new TypeOrmVentasPersistenciaRepository(applicationDatabase),
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

    applicationDatabase = null;
    ventasPersistenciaService = null;
    tempDirectory = null;
  });

  it('persiste una venta completa y actualiza stock, histórico y caja', async (): Promise<void> => {
    const service: VentasPersistenciaService = requireService();

    const command: GuardarVentaCommand = createNormalSaleCommand('venta-normal-1');

    const result: VentaPersistidaRecord = await service.save(command);

    expect(result.publicId).toBe('venta-normal-1');

    expect(result.serie).toBe('');

    expect(result.numero).toBe(1);

    expect(result.totalCents).toBe(2_200);

    const dataSource: DataSource = await requireDatabase().connect();

    expect(await countRows(dataSource, 'venta')).toBe(1);

    expect(await countRows(dataSource, 'linea_venta')).toBe(2);

    expect(await countRows(dataSource, 'venta_pago')).toBe(2);

    const stock: StockRow = await queryOne<StockRow>(
      dataSource,
      `
              SELECT
                stock
              FROM articulo
              WHERE public_id = ?
            `,
      ['articulo-1'],
    );

    expect(stock.stock).toBe(18);

    const historico: HistoricoRow = await queryOne<HistoricoRow>(
      dataSource,
      `
              SELECT
                stock_previo,
                diferencia,
                stock_final,
                puc_micros,
                pvp_micros
              FROM historico_articulo
              WHERE id_venta = ?
            `,
      [result.id],
    );

    expect(historico).toEqual({
      stock_previo: 20,
      diferencia: 2,
      stock_final: 18,
      puc_micros: 4_000_000,
      pvp_micros: 10_000_000,
    });

    const caja: CajaRow = await queryOne<CajaRow>(
      dataSource,
      `
              SELECT
                ventas_cents,
                beneficios_cents,
                descuentos_cents,
                importe_cierre_teorico_cents
              FROM caja
              WHERE public_id = ?
            `,
      ['caja-1'],
    );

    expect(caja).toEqual({
      ventas_cents: 2_200,
      beneficios_cents: 1_400,
      descuentos_cents: 300,
      importe_cierre_teorico_cents: 1_200,
    });

    const cajaTipos: readonly CajaTipoRow[] = await queryRows<CajaTipoRow>(
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
                WHERE public_id = ?
              )

              ORDER BY tp.slug
            `,
      ['caja-1'],
    );

    expect(cajaTipos).toEqual([
      {
        slug: 'efectivo',
        operaciones: 1,
        importe_total_cents: 1_200,
        importe_descuento_cents: 164,
      },
      {
        slug: 'tarjeta',
        operaciones: 1,
        importe_total_cents: 1_000,
        importe_descuento_cents: 136,
      },
    ]);

    const secuencia: SecuenciaRow = await queryOne<SecuenciaRow>(
      dataSource,
      `
              SELECT
                ultimo_numero
              FROM secuencia_documento
              WHERE
                tipo = 'venta'
                AND serie = ''
            `,
    );

    expect(secuencia.ultimo_numero).toBe(1);

    const foreignKeyErrors: readonly unknown[] = (await dataSource.query(
      'PRAGMA foreign_key_check',
    )) as readonly unknown[];

    expect(foreignKeyErrors).toEqual([]);
  });

  it('es idempotente y no repite ningún efecto al guardar dos veces la misma venta', async (): Promise<void> => {
    const service: VentasPersistenciaService = requireService();

    const command: GuardarVentaCommand = createNormalSaleCommand('venta-idempotente-1');

    const firstResult: VentaPersistidaRecord = await service.save(command);

    const secondResult: VentaPersistidaRecord = await service.save(command);

    expect(secondResult).toEqual(firstResult);

    const dataSource: DataSource = await requireDatabase().connect();

    expect(await countRows(dataSource, 'venta')).toBe(1);

    expect(await countRows(dataSource, 'linea_venta')).toBe(2);

    expect(await countRows(dataSource, 'venta_pago')).toBe(2);

    expect(await countRows(dataSource, 'historico_articulo')).toBe(1);

    const stock: StockRow = await queryOne<StockRow>(
      dataSource,
      `
              SELECT stock
              FROM articulo
              WHERE public_id = ?
            `,
      ['articulo-1'],
    );

    expect(stock.stock).toBe(18);

    const caja: CajaRow = await queryOne<CajaRow>(
      dataSource,
      `
              SELECT
                ventas_cents,
                beneficios_cents,
                descuentos_cents,
                importe_cierre_teorico_cents
              FROM caja
              WHERE public_id = ?
            `,
      ['caja-1'],
    );

    expect(caja).toEqual({
      ventas_cents: 2_200,
      beneficios_cents: 1_400,
      descuentos_cents: 300,
      importe_cierre_teorico_cents: 1_200,
    });
  });

  it('hace rollback de todos los efectos si falla al final de la transacción', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
            UPDATE caja_tipo
            SET operaciones = ?
            WHERE
              id_caja = (
                SELECT id
                FROM caja
                WHERE public_id = ?
              )
              AND id_tipo_pago = (
                SELECT id
                FROM tipo_pago
                WHERE public_id = ?
              )
          `,
      [Number.MAX_SAFE_INTEGER, 'caja-1', 'tipo-pago-efectivo'],
    );

    const command: GuardarVentaCommand = {
      publicId: 'venta-rollback-1',
      cajaPublicId: 'caja-1',
      empleadoPublicId: 'empleado-1',
      clientePublicId: null,
      devolucionVentaOrigenPublicId: null,
      reservasOrigenPublicIds: [],
      totalCents: 1_000,
      lineas: [
        {
          articuloPublicId: 'articulo-1',
          nombre: 'Artículo de prueba',
          pucMicros: 4_000_000,
          pvpMicros: 10_000_000,
          ivaBps: 2_100,
          importeMicros: 10_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 1,
          regalo: false,
          devolucionLineaOrigenPublicId: null,
          reservaLineaOrigenPublicId: null,
        },
      ],
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          importeCents: 1_000,
          entregadoCents: 1_000,
          cambioCents: 0,
        },
      ],
    };

    await expect(requireService().save(command)).rejects.toThrow(
      'El número de operaciones del tipo de pago supera el rango numérico seguro.',
    );

    expect(await countRows(dataSource, 'venta')).toBe(0);

    expect(await countRows(dataSource, 'linea_venta')).toBe(0);

    expect(await countRows(dataSource, 'venta_pago')).toBe(0);

    expect(await countRows(dataSource, 'historico_articulo')).toBe(0);

    const stock: StockRow = await queryOne<StockRow>(
      dataSource,
      `
              SELECT stock
              FROM articulo
              WHERE public_id = ?
            `,
      ['articulo-1'],
    );

    expect(stock.stock).toBe(20);

    const caja: CajaRow = await queryOne<CajaRow>(
      dataSource,
      `
              SELECT
                ventas_cents,
                beneficios_cents,
                descuentos_cents,
                importe_cierre_teorico_cents
              FROM caja
              WHERE public_id = ?
            `,
      ['caja-1'],
    );

    expect(caja).toEqual({
      ventas_cents: 0,
      beneficios_cents: 0,
      descuentos_cents: 0,
      importe_cierre_teorico_cents: 0,
    });

    const cajaTipo: {
      readonly operaciones: number;
    } = await queryOne<{
      readonly operaciones: number;
    }>(
      dataSource,
      `
            SELECT
              operaciones
            FROM caja_tipo
            WHERE
              id_caja = (
                SELECT id
                FROM caja
                WHERE public_id = ?
              )
              AND id_tipo_pago = (
                SELECT id
                FROM tipo_pago
                WHERE public_id = ?
              )
          `,
      ['caja-1', 'tipo-pago-efectivo'],
    );

    expect(cajaTipo.operaciones).toBe(Number.MAX_SAFE_INTEGER);

    expect(await countRows(dataSource, 'secuencia_documento')).toBe(0);
  });
});

async function createSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('PRAGMA foreign_keys = ON');

  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

async function seedBaseData(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
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
    `,
  );

  await dataSource.query(
    `
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
    `,
  );

  await dataSource.query(
    `
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
    `,
  );

  await dataSource.query(
    `
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
        '2026-08-21T00:00:00.000Z'
      )
    `,
  );

  await dataSource.query(
    `
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
    `,
  );

  await dataSource.query(
    `
      INSERT INTO marca (
        public_id,
        nombre
      )
      VALUES (
        'marca-1',
        'Marca test'
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO articulo (
        public_id,
        localizador,
        nombre,
        slug,
        id_marca,
        puc_micros,
        pvp_cents,
        iva_bps,
        stock
      )
      VALUES (
        'articulo-1',
        1,
        'Artículo de prueba',
        'articulo-de-prueba',
        (
          SELECT id
          FROM marca
          WHERE public_id = 'marca-1'
        ),
        4000000,
        1000,
        2100,
        20
      )
    `,
  );
}

function createNormalSaleCommand(publicId: string): GuardarVentaCommand {
  return {
    publicId,
    cajaPublicId: 'caja-1',
    empleadoPublicId: 'empleado-1',
    clientePublicId: null,
    devolucionVentaOrigenPublicId: null,
    reservasOrigenPublicIds: [],
    totalCents: 2_200,
    lineas: [
      {
        articuloPublicId: 'articulo-1',
        nombre: 'Artículo de prueba',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 18_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        unidades: 2,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
      {
        articuloPublicId: null,
        nombre: 'Varios',
        pucMicros: 0,
        pvpMicros: 5_000_000,
        ivaBps: 2_100,
        importeMicros: 4_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 1_000_000,
        unidades: 1,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ],
    pagos: [
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: 1_200,
        entregadoCents: 2_000,
        cambioCents: 800,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ],
  };
}

function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de test no está inicializada.');
  }

  return applicationDatabase;
}

function requireService(): VentasPersistenciaService {
  if (ventasPersistenciaService === null) {
    throw new Error('El servicio de ventas de test no está inicializado.');
  }

  return ventasPersistenciaService;
}

async function countRows(dataSource: DataSource, table: string): Promise<number> {
  const allowedTables: readonly string[] = [
    'venta',
    'linea_venta',
    'venta_pago',
    'historico_articulo',
    'secuencia_documento',
  ];

  if (!allowedTables.includes(table)) {
    throw new Error(`La tabla ${table} no está permitida en este helper de test.`);
  }

  const row: CountRow = await queryOne<CountRow>(
    dataSource,
    `SELECT COUNT(*) AS total FROM ${table}`,
  );

  return row.total;
}

async function queryOne<T>(
  dataSource: DataSource,
  sql: string,
  parameters: readonly unknown[] = [],
): Promise<T> {
  const rows: readonly T[] = await queryRows<T>(dataSource, sql, parameters);

  const row: T | undefined = rows[0];

  if (row === undefined) {
    throw new Error('La consulta de test no ha devuelto ninguna fila.');
  }

  return row;
}

async function queryRows<T>(
  dataSource: DataSource,
  sql: string,
  parameters: readonly unknown[] = [],
): Promise<readonly T[]> {
  return (await dataSource.query(sql, [...parameters])) as readonly T[];
}
