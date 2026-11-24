import type {
  TiendaOnlineImportacionPaginaResultado,
  TiendaOnlineImportacionPedidoResultado,
  TiendaOnlineImportacionService,
} from '@backend/application/tienda-online/tienda-online-importacion.service';
import {
  TiendaOnlineSincronizacionService,
  type TiendaOnlineAckPolitica,
} from '@backend/application/tienda-online/tienda-online-sincronizacion.service';
import type VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type {
  VentaTicketBaiEstado,
  VentaTicketBaiRecord,
} from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import { describe, expect, it } from 'vitest';

/** Resultado comercial de un pedido ya procesado. */
function createPedido(
  id: number,
  estado: TiendaOnlineImportacionPedidoResultado['estado'] = 'fiscal-step-completed',
): TiendaOnlineImportacionPedidoResultado {
  return {
    orderId: id,
    reference: `ORDER-${id}`,
    ventaId: estado === 'blocked' || estado === 'persistence-error' ? null : id,
    estado,
    error: estado === 'fiscal-step-completed' ? null : 'Incidencia del pedido.',
  };
}

/** Construye una página de resultados comerciales. */
function createPage(
  afterId: number,
  pedidos: readonly TiendaOnlineImportacionPedidoResultado[],
  hasMore: boolean = false,
): TiendaOnlineImportacionPaginaResultado {
  return {
    afterId,
    nextAfterId: pedidos.length === 0 ? afterId : (pedidos[pedidos.length - 1]?.orderId ?? afterId),
    hasMore,
    pedidos,
  };
}

/** Importador simulado que devuelve páginas controladas. */
class FakeImportacionService implements Pick<TiendaOnlineImportacionService, 'importPage'> {
  readonly pages: Map<number, TiendaOnlineImportacionPaginaResultado> = new Map<
    number,
    TiendaOnlineImportacionPaginaResultado
  >();

  readonly cursors: number[] = [];

  /** Recupera una página según el cursor solicitado. */
  importPage(afterId: number = 0): Promise<TiendaOnlineImportacionPaginaResultado> {
    this.cursors.push(afterId);

    const page = this.pages.get(afterId);

    if (page === undefined) {
      return Promise.reject(new Error('Página de prueba no configurada.'));
    }

    return Promise.resolve(page);
  }
}

/** Construye un registro fiscal existente. */
function createFiscalRecord(idVenta: number, estado: VentaTicketBaiEstado): VentaTicketBaiRecord {
  return {
    idVenta,
    entorno: null,
    nifEmisor: null,
    serie: null,
    numero: null,
    estado,
    identificador: null,
    huella: null,
    qr: null,
    url: null,
    intentos: 0,
    ultimoError: null,
    solicitudPayload: null,
    respuestaPayload: null,
    enviadoAt: null,
    aceptadoAt: null,
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
  };
}

/** Repositorio fiscal de memoria. */
class FakeFiscalRepository implements Pick<VentasTicketBaiRepository, 'findByVentaId'> {
  readonly states: Map<number, VentaTicketBaiEstado> = new Map<number, VentaTicketBaiEstado>();

  readonly reads: number[] = [];

  /** Recupera el estado fiscal persistido del fixture. */
  findByVentaId(idVenta: number): Promise<VentaTicketBaiRecord | null> {
    this.reads.push(idVenta);

    const estado = this.states.get(idVenta);

    return Promise.resolve(estado === undefined ? null : createFiscalRecord(idVenta, estado));
  }
}

/** Reconciliación fiscal controlada para las pruebas. */
class FakeFiscalService implements Pick<VentasTicketBaiService, 'reconcile'> {
  readonly calls: number[] = [];

  readonly outcomes: Map<number, VentaTicketBaiEstado> = new Map<number, VentaTicketBaiEstado>();

  constructor(private readonly repository: FakeFiscalRepository) {}

  /** Simula la consulta del resultado remoto de TicketBAI. */
  reconcile(idVenta: number): Promise<void> {
    this.calls.push(idVenta);

    const newState = this.outcomes.get(idVenta);

    if (newState !== undefined) {
      this.repository.states.set(idVenta, newState);
    }

    return Promise.resolve();
  }
}

/** Cliente HTTP simulado que registra confirmaciones. */
class FakePedidosClient implements Pick<TiendaOnlinePedidosClient, 'acknowledge'> {
  readonly acknowledgements: number[] = [];

  failNext: boolean = false;

  /** Registra el ACK o simula un fallo de comunicación. */
  acknowledge(orderId: number): Promise<void> {
    this.acknowledgements.push(orderId);

    if (this.failNext) {
      this.failNext = false;

      return Promise.reject(new Error('Fallo temporal de ACK.'));
    }

    return Promise.resolve();
  }
}

/** Dependencias de una ejecución controlada. */
interface TestFixture {
  readonly importacion: FakeImportacionService;
  readonly fiscalRepository: FakeFiscalRepository;
  readonly fiscalService: FakeFiscalService;
  readonly client: FakePedidosClient;
  readonly service: TiendaOnlineSincronizacionService;
}

/** Prepara el servicio con una política explícita. */
function createFixture(politica: TiendaOnlineAckPolitica = 'solo-aceptada'): TestFixture {
  const importacion = new FakeImportacionService();
  const fiscalRepository = new FakeFiscalRepository();
  const fiscalService = new FakeFiscalService(fiscalRepository);
  const client = new FakePedidosClient();

  const service = new TiendaOnlineSincronizacionService(
    importacion,
    fiscalRepository,
    fiscalService,
    client,
    politica,
  );

  return {
    importacion,
    fiscalRepository,
    fiscalService,
    client,
    service,
  };
}

describe('TiendaOnlineSincronizacionService', (): void => {
  it('confirma un pedido cuya factura está aceptada', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(10)]));

    fixture.fiscalRepository.states.set(10, 'aceptada');

    const result = await fixture.service.runOnce();

    expect(result.pedidos).toEqual([
      {
        orderId: 10,
        reference: 'ORDER-10',
        ventaId: 10,
        estado: 'acknowledged',
        estadoFiscal: 'aceptada',
        error: null,
      },
    ]);

    expect(fixture.client.acknowledgements).toEqual([10]);
    expect(fixture.fiscalService.calls).toEqual([]);
  });

  it('no confirma no_aplica con la política estricta', async (): Promise<void> => {
    const fixture = createFixture('solo-aceptada');

    fixture.importacion.pages.set(0, createPage(0, [createPedido(11)]));

    fixture.fiscalRepository.states.set(11, 'no_aplica');

    const result = await fixture.service.runOnce();

    expect(result.pedidos[0]).toMatchObject({
      estado: 'fiscal-not-ready',
      estadoFiscal: 'no_aplica',
    });

    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('permite no_aplica cuando la política lo autoriza', async (): Promise<void> => {
    const fixture = createFixture('aceptada-o-no-aplica');

    fixture.importacion.pages.set(0, createPage(0, [createPedido(12)]));

    fixture.fiscalRepository.states.set(12, 'no_aplica');

    const result = await fixture.service.runOnce();

    expect(result.pedidos[0]).toMatchObject({
      estado: 'acknowledged',
      estadoFiscal: 'no_aplica',
    });

    expect(fixture.client.acknowledgements).toEqual([12]);
  });

  it('no confirma facturas pendientes, rechazadas o anuladas', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(
      0,
      createPage(0, [createPedido(21), createPedido(22), createPedido(23), createPedido(24)]),
    );

    fixture.fiscalRepository.states.set(21, 'pendiente');
    fixture.fiscalRepository.states.set(22, 'rechazada');
    fixture.fiscalRepository.states.set(23, 'anulada');
    fixture.fiscalRepository.states.set(24, 'error_permanente');

    const result = await fixture.service.runOnce();

    expect(result.pedidos.map((item) => item.estado)).toEqual([
      'fiscal-not-ready',
      'fiscal-not-ready',
      'fiscal-not-ready',
      'fiscal-not-ready',
    ]);

    expect(fixture.client.acknowledgements).toEqual([]);
    expect(fixture.fiscalService.calls).toEqual([]);
  });

  it('reconcilia un pendiente remoto antes de confirmar', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(31)]));

    fixture.fiscalRepository.states.set(31, 'pendiente_remoto');
    fixture.fiscalService.outcomes.set(31, 'aceptada');

    const result = await fixture.service.runOnce();

    expect(fixture.fiscalService.calls).toEqual([31]);
    expect(fixture.fiscalRepository.reads).toEqual([31, 31]);

    expect(result.pedidos[0]).toMatchObject({
      estado: 'acknowledged',
      estadoFiscal: 'aceptada',
    });

    expect(fixture.client.acknowledgements).toEqual([31]);
  });

  it('no confirma una reconciliación que sigue pendiente', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(32)]));

    fixture.fiscalRepository.states.set(32, 'enviando');

    const result = await fixture.service.runOnce();

    expect(fixture.fiscalService.calls).toEqual([32]);

    expect(result.pedidos[0]).toMatchObject({
      estado: 'fiscal-not-ready',
      estadoFiscal: 'enviando',
    });

    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('no confirma pedidos con errores comerciales o fiscales', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(
      0,
      createPage(0, [
        createPedido(41, 'blocked'),
        createPedido(42, 'persistence-error'),
        createPedido(43, 'fiscal-error'),
      ]),
    );

    const result = await fixture.service.runOnce();

    expect(result.pedidos.map((item) => item.estado)).toEqual([
      'blocked',
      'persistence-error',
      'fiscal-error',
    ]);

    expect(fixture.fiscalRepository.reads).toEqual([]);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('no confirma ventas sin registro fiscal persistido', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(44)]));

    const result = await fixture.service.runOnce();

    expect(result.pedidos[0]).toMatchObject({
      estado: 'fiscal-not-ready',
      estadoFiscal: null,
    });

    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('permite reintentar un ACK fallido en otra ejecución', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(51)]));

    fixture.fiscalRepository.states.set(51, 'aceptada');
    fixture.client.failNext = true;

    const first = await fixture.service.runOnce();

    expect(first.pedidos[0]).toMatchObject({
      estado: 'ack-error',
      ventaId: 51,
      error: 'Fallo temporal de ACK.',
    });

    const second = await fixture.service.runOnce();

    expect(second.pedidos[0]).toMatchObject({
      estado: 'acknowledged',
      ventaId: 51,
    });

    expect(fixture.importacion.cursors).toEqual([0, 0]);

    expect(fixture.client.acknowledgements).toEqual([51, 51]);
  });

  it('pagina sin perder un pedido bloqueado anterior', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(
      0,
      createPage(0, [createPedido(10, 'blocked'), createPedido(20)], true),
    );

    fixture.importacion.pages.set(20, createPage(20, [createPedido(21)]));

    fixture.fiscalRepository.states.set(20, 'aceptada');
    fixture.fiscalRepository.states.set(21, 'aceptada');

    const result = await fixture.service.runOnce();

    expect(result.paginas).toBe(2);
    expect(result.cursorFinal).toBe(21);
    expect(result.limiteAlcanzado).toBe(false);

    expect(result.pedidos.map((item) => item.estado)).toEqual([
      'blocked',
      'acknowledged',
      'acknowledged',
    ]);

    expect(fixture.importacion.cursors).toEqual([0, 20]);

    expect(fixture.client.acknowledgements).toEqual([20, 21]);

    /*
     * En la siguiente ejecución empezamos en cero.
     * Así el pedido 10 podrá volver a procesarse.
     */
    fixture.importacion.cursors.length = 0;

    await fixture.service.runOnce();

    expect(fixture.importacion.cursors).toEqual([0, 20]);
  });

  it('informa cuando alcanza el límite de páginas', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(20)], true));

    fixture.fiscalRepository.states.set(20, 'aceptada');

    const result = await fixture.service.runOnce(1);

    expect(result.paginas).toBe(1);
    expect(result.cursorFinal).toBe(20);
    expect(result.limiteAlcanzado).toBe(true);

    expect(fixture.importacion.cursors).toEqual([0]);
  });

  it('rechaza páginas con cursores incoherentes', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.importacion.pages.set(0, createPage(0, [createPedido(10)], true));
    fixture.importacion.pages.set(10, createPage(10, [createPedido(12), createPedido(11)]));
    fixture.fiscalRepository.states.set(10, 'aceptada');

    await expect(fixture.service.runOnce()).rejects.toThrow(
      'Los pedidos de la página no están ordenados correctamente.',
    );
  });
});
