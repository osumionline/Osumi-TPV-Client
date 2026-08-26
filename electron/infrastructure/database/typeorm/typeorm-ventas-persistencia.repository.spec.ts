import VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmVentasHistoricoRepository from '@infrastructure/database/typeorm/typeorm-ventas-historico.repository';
import TypeOrmVentasPersistenciaRepository from '@infrastructure/database/typeorm/typeorm-ventas-persistencia.repository';
import TypeOrmVentasTicketsRepository from '@infrastructure/database/typeorm/typeorm-ventas-tickets.repository';
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

interface DevolucionOrigenRow {
  readonly unidades_devueltas: number;
}

interface DevolucionTrazabilidadRow {
  readonly venta_origen_public_id: string;
  readonly linea_origen_public_id: string;
}

interface ReservaConsumidaRow {
  readonly public_id: string;
  readonly deleted_at: string | null;
}

interface HistoricoReservaRow {
  readonly articulo_public_id: string;
  readonly stock_previo: number;
  readonly diferencia: number;
  readonly stock_final: number;
}

interface LineaReservaTrazabilidadRow {
  readonly linea_origen_public_id: string;
}

interface LineaVentaSnapshotRow {
  readonly localizador: number;
  readonly marca: string;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let ventasPersistenciaService: VentasPersistenciaService | null = null;
let ventasHistoricoRepository: TypeOrmVentasHistoricoRepository | null = null;

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
    ventasHistoricoRepository = new TypeOrmVentasHistoricoRepository(applicationDatabase);
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
    ventasHistoricoRepository = null;
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

    const lineaSnapshot: LineaVentaSnapshotRow = await queryOne<LineaVentaSnapshotRow>(
      dataSource,
      `
      SELECT
        localizador,
        marca
      FROM linea_venta
      WHERE
        id_venta = ?
        AND id_articulo = (
          SELECT id
          FROM articulo
          WHERE public_id = ?
        )
    `,
      [result.id, 'articulo-1'],
    );

    expect(lineaSnapshot).toEqual({
      localizador: 1,
      marca: 'Marca test',
    });

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

  it('recupera el snapshot persistido necesario para el ticket definitivo', async (): Promise<void> => {
    const result: VentaPersistidaRecord = await requireService().save(
      createNormalSaleCommand('venta-ticket-1'),
    );

    const ticketsService: VentasTicketsService = new VentasTicketsService(
      new TypeOrmVentasTicketsRepository(requireDatabase()),
      new NoopVentaTicketPdfStorage(),
    );

    const ticket: VentaTicketInterface | null = await ticketsService.getByVentaId(result.id);

    expect(ticket).not.toBeNull();

    expect(ticket).toEqual({
      id: result.id,
      publicId: 'venta-ticket-1',
      serie: '',
      numero: 1,
      fecha: result.fecha,
      empleadoNombre: 'Empleado test',
      clienteNombre: null,
      totalCents: 2_200,
      ticketRevision: 1,
      ticketPdfRevision: 0,
      pagos: [
        {
          nombre: 'Efectivo',
          importeCents: 1_200,
          entregadoCents: 2_000,
          cambioCents: 800,
        },
        {
          nombre: 'Tarjeta',
          importeCents: 1_000,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
      lineas: [
        {
          nombre: 'Artículo de prueba',
          pvpMicros: 10_000_000,
          ivaBps: 2_100,
          importeMicros: 18_000_000,
          descuentoBps: 1_000,
          importeDescuentoMicros: 0,
          unidades: 2,
          regalo: false,
        },
        {
          nombre: 'Varios',
          pvpMicros: 5_000_000,
          ivaBps: 2_100,
          importeMicros: 4_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 1_000_000,
          unidades: 1,
          regalo: false,
        },
      ],
    });
  });

  it('recupera el histórico de un periodo con pagos y agregados económicos', async (): Promise<void> => {
    const command: GuardarVentaCommand = createNormalSaleCommand('venta-historico-periodo-1');

    const result: VentaPersistidaRecord = await requireService().save(command);

    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
      UPDATE venta
      SET
        created_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
      ['2026-08-25T10:00:00.000Z', '2026-08-25T10:00:00.000Z', result.id],
    );

    const historico = await requireHistoricoRepository().findByPeriod(
      '2026-08-25T00:00:00.000Z',
      '2026-08-26T00:00:00.000Z',
    );

    expect(historico.ventas).toHaveLength(1);

    const venta = historico.ventas[0];

    expect(venta).toBeDefined();

    if (venta === undefined) {
      throw new Error('No se ha recuperado la venta esperada del histórico.');
    }

    expect(venta.id).toBe(result.id);
    expect(venta.publicId).toBe(command.publicId);
    expect(venta.fecha).toBe('2026-08-25T10:00:00.000Z');
    expect(venta.totalCents).toBe(2_200);
    expect(venta.clienteNombre).toBeNull();
    expect(venta.tieneIncidenciaTicketBai).toBe(false);

    expect(
      venta.pagos.map((pago) => ({
        tipoPagoPublicId: pago.tipoPagoPublicId,
        nombre: pago.nombre,
        importeCents: pago.importeCents,
      })),
    ).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        nombre: 'Efectivo',
        importeCents: 1_200,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        nombre: 'Tarjeta',
        importeCents: 1_000,
      },
    ]);

    expect(historico.resumen.numeroVentas).toBe(1);
    expect(historico.resumen.totalCents).toBe(2_200);
    expect(historico.resumen.ticketMedioCents).toBe(2_200);
    expect(historico.resumen.beneficioCents).toBe(1_400);

    expect(historico.resumen.totalesPorTipoPago).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        nombre: 'Efectivo',
        importeCents: 1_200,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        nombre: 'Tarjeta',
        importeCents: 1_000,
      },
    ]);
  });

  it('recupera el detalle histórico desde los snapshots persistidos', async (): Promise<void> => {
    const result: VentaPersistidaRecord = await requireService().save(
      createNormalSaleCommand('venta-historico-detalle-1'),
    );

    const detalle = await requireHistoricoRepository().findDetalleByVentaId(result.id);

    expect(detalle).not.toBeNull();

    if (detalle === null) {
      throw new Error('No se ha recuperado el detalle histórico esperado.');
    }

    expect(detalle.id).toBe(result.id);
    expect(detalle.publicId).toBe('venta-historico-detalle-1');
    expect(detalle.serie).toBe('');
    expect(detalle.numero).toBe(1);
    expect(detalle.empleadoNombre).toBe('Empleado test');
    expect(detalle.cliente).toBeNull();
    expect(detalle.totalCents).toBe(2_200);

    expect(detalle.numeroPagos).toBe(2);
    expect(detalle.cajaAbierta).toBe(true);
    expect(detalle.facturada).toBe(false);
    expect(detalle.tieneLineasPositivas).toBe(true);
    expect(detalle.tieneIncidenciaTicketBai).toBe(false);

    expect(detalle.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        nombre: 'Efectivo',
        importeCents: 1_200,
        entregadoCents: 2_000,
        cambioCents: 800,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        nombre: 'Tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);

    expect(detalle.lineas).toEqual([
      {
        id: expect.any(Number),
        localizador: 1,
        marca: 'Marca test',
        descripcion: 'Artículo de prueba',
        unidades: 2,
        pvpMicros: 10_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        importeMicros: 18_000_000,
        regalo: false,
      },
      {
        id: expect.any(Number),
        localizador: 0,
        marca: 'Varios',
        descripcion: 'Varios',
        unidades: 1,
        pvpMicros: 5_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 1_000_000,
        importeMicros: 4_000_000,
        regalo: false,
      },
    ]);
  });

  it('aplica un inicio inclusivo y un final exclusivo al consultar el periodo', async (): Promise<void> => {
    const result: VentaPersistidaRecord = await requireService().save(
      createNormalSaleCommand('venta-historico-limite-1'),
    );

    const dataSource: DataSource = await requireDatabase().connect();

    await dataSource.query(
      `
      UPDATE venta
      SET
        created_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
      ['2026-08-26T00:00:00.000Z', '2026-08-26T00:00:00.000Z', result.id],
    );

    const historico = await requireHistoricoRepository().findByPeriod(
      '2026-08-25T00:00:00.000Z',
      '2026-08-26T00:00:00.000Z',
    );

    expect(historico.ventas).toEqual([]);

    expect(historico.resumen).toEqual({
      numeroVentas: 0,
      totalCents: 0,
      ticketMedioCents: 0,
      beneficioCents: 0,
      totalesPorTipoPago: [],
    });
  });

  it('devuelve null al solicitar el detalle de una venta inexistente', async (): Promise<void> => {
    const detalle = await requireHistoricoRepository().findDetalleByVentaId(999_999);

    expect(detalle).toBeNull();
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
          localizador: 1,
          marca: 'Marca test',
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

  it('acumula una devolución parcial y rechaza devolver más unidades de las disponibles', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await seedReturnOrigin(dataSource);

    const service: VentasPersistenciaService = requireService();

    const result: VentaPersistidaRecord = await service.save(
      createPartialReturnCommand('venta-devolucion-1'),
    );

    expect(result.numero).toBe(41);

    expect(result.totalCents).toBe(-1_800);

    const origen: DevolucionOrigenRow = await queryOne<DevolucionOrigenRow>(
      dataSource,
      `
      SELECT
        unidades_devueltas
      FROM linea_venta
      WHERE public_id = ?
    `,
      ['linea-venta-origen-1'],
    );

    expect(origen.unidades_devueltas).toBe(3);

    const trazabilidad: DevolucionTrazabilidadRow = await queryOne<DevolucionTrazabilidadRow>(
      dataSource,
      `
        SELECT
          vo.public_id AS venta_origen_public_id,
          lvo.public_id AS linea_origen_public_id
        FROM venta v

        INNER JOIN venta vo
          ON vo.id = v.id_venta_origen_devolucion

        INNER JOIN linea_venta lv
          ON lv.id_venta = v.id

        INNER JOIN linea_venta lvo
          ON lvo.id = lv.id_linea_venta_origen_devolucion

        WHERE v.public_id = ?
      `,
      ['venta-devolucion-1'],
    );

    expect(trazabilidad).toEqual({
      venta_origen_public_id: 'venta-origen-devolucion-1',
      linea_origen_public_id: 'linea-venta-origen-1',
    });

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

    expect(stock.stock).toBe(22);

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
      diferencia: -2,
      stock_final: 22,
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
      ventas_cents: -1_800,
      beneficios_cents: -1_000,
      descuentos_cents: -200,
      importe_cierre_teorico_cents: -1_800,
    });

    await expect(
      service.save(createPartialReturnCommand('venta-devolucion-excesiva-1')),
    ).rejects.toThrow('La devolución supera las unidades disponibles de la línea original.');

    const origenTrasError: DevolucionOrigenRow = await queryOne<DevolucionOrigenRow>(
      dataSource,
      `
        SELECT
          unidades_devueltas
        FROM linea_venta
        WHERE public_id = ?
      `,
      ['linea-venta-origen-1'],
    );

    expect(origenTrasError.unidades_devueltas).toBe(3);

    const stockTrasError: StockRow = await queryOne<StockRow>(
      dataSource,
      `
      SELECT
        stock
      FROM articulo
      WHERE public_id = ?
    `,
      ['articulo-1'],
    );

    expect(stockTrasError.stock).toBe(22);

    expect(await countRows(dataSource, 'venta')).toBe(2);

    expect(await countRows(dataSource, 'venta_pago')).toBe(1);

    expect(await countRows(dataSource, 'historico_articulo')).toBe(1);

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

    expect(secuencia.ultimo_numero).toBe(41);
  });

  it('consume una reserva, reconcilia cantidades y restaura una línea eliminada', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await seedReservation(dataSource);

    const result: VentaPersistidaRecord = await requireService().save(
      createReservationSaleCommand(),
    );

    expect(result.totalCents).toBe(2_700);

    const articulo1: StockRow = await queryOne<StockRow>(
      dataSource,
      `
      SELECT
        stock
      FROM articulo
      WHERE public_id = ?
    `,
      ['articulo-1'],
    );

    expect(articulo1.stock).toBe(17);

    const articulo2: StockRow = await queryOne<StockRow>(
      dataSource,
      `
      SELECT
        stock
      FROM articulo
      WHERE public_id = ?
    `,
      ['articulo-2'],
    );

    expect(articulo2.stock).toBe(10);

    const historicos: readonly HistoricoReservaRow[] = await queryRows<HistoricoReservaRow>(
      dataSource,
      `
        SELECT
          a.public_id AS articulo_public_id,
          h.stock_previo,
          h.diferencia,
          h.stock_final
        FROM historico_articulo h

        INNER JOIN articulo a
          ON a.id = h.id_articulo

        WHERE h.id_venta = ?

        ORDER BY a.public_id
      `,
      [result.id],
    );

    expect(historicos).toEqual([
      {
        articulo_public_id: 'articulo-1',
        stock_previo: 15,
        diferencia: -2,
        stock_final: 17,
      },
      {
        articulo_public_id: 'articulo-2',
        stock_previo: 8,
        diferencia: -2,
        stock_final: 10,
      },
    ]);

    const reserva: ReservaConsumidaRow = await queryOne<ReservaConsumidaRow>(
      dataSource,
      `
        SELECT
          r.public_id,
          r.deleted_at
        FROM venta_reserva vr

        INNER JOIN reserva r
          ON r.id = vr.id_reserva

        WHERE vr.id_venta = ?
      `,
      [result.id],
    );

    expect(reserva.public_id).toBe('reserva-1');

    expect(reserva.deleted_at).not.toBeNull();

    const lineaOrigen: LineaReservaTrazabilidadRow = await queryOne<LineaReservaTrazabilidadRow>(
      dataSource,
      `
        SELECT
          lr.public_id AS linea_origen_public_id
        FROM linea_venta lv

        INNER JOIN linea_reserva lr
          ON lr.id = lv.id_linea_reserva_origen

        WHERE lv.id_venta = ?
      `,
      [result.id],
    );

    expect(lineaOrigen.linea_origen_public_id).toBe('linea-reserva-1');

    const lineasPersistidas: CountRow = await queryOne<CountRow>(
      dataSource,
      `
      SELECT
        COUNT(*) AS total
      FROM linea_venta
      WHERE id_venta = ?
    `,
      [result.id],
    );

    expect(lineasPersistidas.total).toBe(1);

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
      ventas_cents: 2_700,
      beneficios_cents: 1_500,
      descuentos_cents: 300,
      importe_cierre_teorico_cents: 0,
    });

    const foreignKeyErrors: readonly unknown[] = (await dataSource.query(
      'PRAGMA foreign_key_check',
    )) as readonly unknown[];

    expect(foreignKeyErrors).toEqual([]);
  });

  it('persiste una venta de total cero sin pagos', async (): Promise<void> => {
    const result: VentaPersistidaRecord = await requireService().save(createZeroTotalGiftCommand());

    expect(result.totalCents).toBe(0);

    const dataSource: DataSource = await requireDatabase().connect();

    expect(await countRows(dataSource, 'venta')).toBe(1);

    expect(await countRows(dataSource, 'linea_venta')).toBe(1);

    expect(await countRows(dataSource, 'venta_pago')).toBe(0);

    expect(await countRows(dataSource, 'historico_articulo')).toBe(1);

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

    expect(stock.stock).toBe(19);

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
      beneficios_cents: -400,
      descuentos_cents: 1_000,
      importe_cierre_teorico_cents: 0,
    });

    const operaciones: CountRow = await queryOne<CountRow>(
      dataSource,
      `
      SELECT
        COALESCE(
          SUM(operaciones),
          0
        ) AS total
      FROM caja_tipo
      WHERE id_caja = (
        SELECT id
        FROM caja
        WHERE public_id = ?
      )
    `,
      ['caja-1'],
    );

    expect(operaciones.total).toBe(0);
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
      'articulo-2',
      2,
      'Artículo reservado eliminado',
      'articulo-reservado-eliminado',
      (
        SELECT id
        FROM marca
        WHERE public_id = 'marca-1'
      ),
      2000000,
      500,
      2100,
      10
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
        localizador: 1,
        marca: 'Marca test',
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
        localizador: 0,
        marca: 'Varios',
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

async function seedReturnOrigin(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO venta (
        public_id,
        id_caja,
        id_empleado,
        serie,
        numero,
        total_cents,
        created_at,
        updated_at
      )
      VALUES (
        'venta-origen-devolucion-1',
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
        '',
        40,
        3600,
        '2026-08-20T10:00:00.000Z',
        '2026-08-20T10:00:00.000Z'
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO linea_venta (
        public_id,
        id_venta,
        id_articulo,
        localizador,
        marca,
        nombre_articulo,
        puc_micros,
        pvp_micros,
        iva_bps,
        importe_micros,
        descuento_bps,
        importe_descuento_micros,
        unidades,
        unidades_devueltas,
        regalo
      )
      VALUES (
        'linea-venta-origen-1',
        (
          SELECT id
          FROM venta
          WHERE public_id = 'venta-origen-devolucion-1'
        ),
        (
          SELECT id
          FROM articulo
          WHERE public_id = 'articulo-1'
        ),
        1,
        'Marca test',
        'Artículo de prueba',
        4000000,
        10000000,
        2100,
        36000000,
        1000,
        0,
        4,
        1,
        0
      )
    `,
  );
}

function createPartialReturnCommand(publicId: string): GuardarVentaCommand {
  return {
    publicId,
    cajaPublicId: 'caja-1',
    empleadoPublicId: 'empleado-1',
    clientePublicId: null,
    devolucionVentaOrigenPublicId: 'venta-origen-devolucion-1',
    reservasOrigenPublicIds: [],
    totalCents: -1_800,
    lineas: [
      {
        articuloPublicId: 'articulo-1',
        localizador: 1,
        marca: 'Marca test',
        nombre: 'Artículo de prueba',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: -18_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 2_000_000,
        unidades: -2,
        regalo: false,
        devolucionLineaOrigenPublicId: 'linea-venta-origen-1',
        reservaLineaOrigenPublicId: null,
      },
    ],
    pagos: [
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: -1_800,
        entregadoCents: null,
        cambioCents: 0,
      },
    ],
  };
}

async function seedReservation(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO cliente (
        public_id,
        nombre_apellidos
      )
      VALUES (
        'cliente-1',
        'Cliente reserva'
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO reserva (
        public_id,
        id_cliente,
        total_cents
      )
      VALUES (
        'reserva-1',
        (
          SELECT id
          FROM cliente
          WHERE public_id = 'cliente-1'
        ),
        5500
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO linea_reserva (
        public_id,
        id_reserva,
        id_articulo,
        nombre_articulo,
        puc_micros,
        pvp_cents,
        iva_bps,
        importe_cents,
        descuento_bps,
        importe_descuento_cents,
        unidades
      )
      VALUES
        (
          'linea-reserva-1',
          (
            SELECT id
            FROM reserva
            WHERE public_id = 'reserva-1'
          ),
          (
            SELECT id
            FROM articulo
            WHERE public_id = 'articulo-1'
          ),
          'Artículo de prueba',
          4000000,
          1000,
          2100,
          4500,
          1000,
          500,
          5
        ),
        (
          'linea-reserva-2',
          (
            SELECT id
            FROM reserva
            WHERE public_id = 'reserva-1'
          ),
          (
            SELECT id
            FROM articulo
            WHERE public_id = 'articulo-2'
          ),
          'Artículo reservado eliminado',
          2000000,
          500,
          2100,
          1000,
          0,
          0,
          2
        )
    `,
  );

  /*
   * Simulamos el efecto que ya produjo la creación
   * original de la reserva sobre el stock.
   */
  await dataSource.query(
    `
      UPDATE articulo
      SET stock = 15
      WHERE public_id = 'articulo-1'
    `,
  );

  await dataSource.query(
    `
      UPDATE articulo
      SET stock = 8
      WHERE public_id = 'articulo-2'
    `,
  );
}

function createReservationSaleCommand(): GuardarVentaCommand {
  return {
    publicId: 'venta-reserva-1',
    cajaPublicId: 'caja-1',
    empleadoPublicId: 'empleado-1',
    clientePublicId: 'cliente-1',
    devolucionVentaOrigenPublicId: null,
    reservasOrigenPublicIds: ['reserva-1'],
    totalCents: 2_700,
    lineas: [
      {
        articuloPublicId: 'articulo-1',
        localizador: 1,
        marca: 'Marca test',
        nombre: 'Artículo de prueba',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 27_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 3_000_000,
        unidades: 3,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: 'linea-reserva-1',
      },
    ],
    pagos: [
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 2_700,
        entregadoCents: null,
        cambioCents: 0,
      },
    ],
  };
}

function createZeroTotalGiftCommand(): GuardarVentaCommand {
  return {
    publicId: 'venta-total-cero-1',
    cajaPublicId: 'caja-1',
    empleadoPublicId: 'empleado-1',
    clientePublicId: null,
    devolucionVentaOrigenPublicId: null,
    reservasOrigenPublicIds: [],
    totalCents: 0,
    lineas: [
      {
        articuloPublicId: 'articulo-1',
        localizador: 1,
        marca: 'Marca test',
        nombre: 'Artículo de prueba',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 0,
        descuentoBps: 0,
        importeDescuentoMicros: 10_000_000,
        unidades: 1,
        regalo: true,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ],
    pagos: [],
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

/**
 * Devuelve el repository de Histórico inicializado para el test actual.
 */
function requireHistoricoRepository(): TypeOrmVentasHistoricoRepository {
  if (ventasHistoricoRepository === null) {
    throw new Error('El repository de histórico de ventas de test no está inicializado.');
  }

  return ventasHistoricoRepository;
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

class NoopVentaTicketPdfStorage implements VentaTicketPdfStorage {
  /**
   * Simula que todavía no existe un PDF materializado.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Simula la ausencia de un PDF persistido.
   */
  read(): Promise<Uint8Array | null> {
    return Promise.resolve(null);
  }

  /**
   * Descarta el PDF recibido durante este test.
   */
  save(): Promise<void> {
    return Promise.resolve();
  }
}
