import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import { TiendaOnlineImportacionService } from '@backend/application/tienda-online/tienda-online-importacion.service';
import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import { TiendaOnlinePedidosService } from '@backend/application/tienda-online/tienda-online-pedidos.service';
import { TiendaOnlineVentaCommandBuilder } from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type {
  TiendaOnlineLineaPedido,
  TiendaOnlinePedidoPendiente,
} from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import { describe, expect, it } from 'vitest';

/** Backend remoto controlado para las pruebas. */
class FakePedidosClient implements TiendaOnlinePedidosClient {
  orders: readonly TiendaOnlinePedidoPendiente[] = [];
  acknowledgements: number[] = [];
  failPending: boolean = false;

  /** Devuelve una página del protocolo real. */
  pending(): Promise<unknown> {
    if (this.failPending) {
      return Promise.reject(new Error('Fallo de conexión.'));
    }

    return Promise.resolve({
      status: 'ok',
      version: 1,
      orders: this.orders,
    });
  }

  /** Registra un ACK inesperado. */
  acknowledge(orderId: number): Promise<void> {
    this.acknowledgements.push(orderId);
    return Promise.resolve();
  }
}

/** Catálogo local sin base de datos. */
class FakeArticulosRepository implements TiendaOnlineArticulosRepository {
  /** Devuelve el artículo válido de la prueba. */
  findByLocalizador(localizador: number): Promise<ArticuloVentaRecord | null> {
    if (localizador !== 123) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: 1,
      publicId: 'articulo-123',
      localizador: 123,
      nombre: 'Artículo local',
      marca: 'Marca local',
      pucMicros: 400_000,
      pvpCents: 1_200,
      pvpDescuentoCents: null,
      ivaBps: 2_100,
      stock: 10,
      fechaCaducidad: null,
      observaciones: null,
      mostrarObservacionesVentas: false,
    });
  }
}

/**
 * Persistencia controlada que reproduce la identidad
 * idempotente por referencia externa.
 */
class FakeVentasRepository {
  readonly ventas: Map<string, VentaPersistidaRecord> = new Map<string, VentaPersistidaRecord>();

  readonly events: string[];

  failNext: boolean = false;

  constructor(events: string[]) {
    this.events = events;
  }

  /**
   * Simula una transacción comercial confirmada.
   */
  async saveOnline(command: GuardarVentaOnlineRecordCommand): Promise<VentaPersistidaRecord> {
    this.events.push('save');

    if (this.failNext) {
      this.failNext = false;
      throw new Error('Fallo de escritura SQLite.');
    }

    const existing: VentaPersistidaRecord | undefined = this.ventas.get(command.referenciaExterna);

    if (existing !== undefined) {
      return existing;
    }

    const venta: VentaPersistidaRecord = {
      id: this.ventas.size + 1,
      publicId: command.publicId,
      serie: '',
      numero: this.ventas.size + 1,
      totalCents: command.totalCents,
      fecha: command.pagadaAt,
    };

    this.ventas.set(command.referenciaExterna, venta);

    return venta;
  }
}

/** Procesamiento fiscal controlado y observable. */
class FakeTicketBaiService {
  readonly events: string[];

  readonly processedIds: number[] = [];

  failNext: boolean = false;

  constructor(events: string[]) {
    this.events = events;
  }

  /**
   * Simula el primer paso fiscal posterior al COMMIT.
   */
  async processInitial(idVenta: number): Promise<void> {
    this.events.push(`fiscal:${idVenta}`);
    this.processedIds.push(idVenta);

    if (this.failNext) {
      this.failNext = false;
      throw new Error('Fallo del servicio fiscal.');
    }
  }
}

/** Conjunto de dependencias aisladas para una prueba. */
interface TestFixture {
  readonly client: FakePedidosClient;
  readonly ventas: FakeVentasRepository;
  readonly fiscal: FakeTicketBaiService;
  readonly events: string[];
  readonly service: TiendaOnlineImportacionService;
}

/** Construye una línea comercial válida. */
function createItem(overrides: Partial<TiendaOnlineLineaPedido> = {}): TiendaOnlineLineaPedido {
  return {
    productId: 57,
    sizeId: 0,
    colorId: 0,
    quantity: 1,
    name: 'Artículo web',
    brand: 'Marca web',
    localizador: '000123',
    ivaBps: 2_100,
    amountBeforeCents: 1_000,
    discountCents: 0,
    lineTotalCents: 1_000,
    ...overrides,
  };
}

/** Construye un pedido completo de la tienda. */
function createOrder(
  id: number,
  overrides: Partial<TiendaOnlinePedidoPendiente> = {},
): TiendaOnlinePedidoPendiente {
  return {
    id,
    reference: `ORDER-${id}`,
    paidAt: '2026-11-13 10:30:00',
    paymentMethod: 'cards',
    productsTotalCents: 1_000,
    shippingCents: 0,
    shippingVatBps: null,
    totalCents: 1_000,
    items: [createItem()],
    ...overrides,
  };
}

/**
 * Conecta el parser, resolver, mapper, builder y orquestador
 * reales con fronteras de persistencia y fiscal controladas.
 */
function createFixture(): TestFixture {
  const events: string[] = [];

  const client = new FakePedidosClient();
  const ventas = new FakeVentasRepository(events);
  const fiscal = new FakeTicketBaiService(events);

  const tipoPago: TipoPagoRecord = {
    id: 1,
    publicId: 'tipo-pago-visa',
    nombre: 'Visa',
    slug: 'visa',
    fotoRelativePath: null,
    afectaCaja: false,
    orden: 1,
    fisico: true,
  };

  const pagosRepository: Pick<TipoPagoRepository, 'findAll'> = {
    findAll(): Promise<readonly TipoPagoRecord[]> {
      return Promise.resolve([tipoPago]);
    },
  };

  const builder = new TiendaOnlineVentaCommandBuilder(pagosRepository, {
    fuenteId: 'tienda-de-pruebas',
    zonaHoraria: 'Europe/Madrid',
    metodosPago: { cards: 'visa' },
  });

  const pedidosService = new TiendaOnlinePedidosService(
    client,
    new TiendaOnlinePedidosPendientesParser(),
    new TiendaOnlineLineasMapper(new TiendaOnlineArticuloResolver(new FakeArticulosRepository())),
  );

  const service = new TiendaOnlineImportacionService(pedidosService, builder, ventas, fiscal);

  return { client, ventas, fiscal, events, service };
}

describe('TiendaOnlineImportacionService', (): void => {
  it('guarda y procesa fiscalmente después del COMMIT', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.client.orders = [createOrder(10)];

    const result = await fixture.service.importPage(0);

    expect(result.pedidos).toHaveLength(1);
    expect(result.pedidos[0]).toMatchObject({
      orderId: 10,
      reference: 'ORDER-10',
      estado: 'fiscal-step-completed',
      ventaId: 1,
      error: null,
    });

    expect(fixture.events).toEqual(['save', 'fiscal:1']);
    expect(fixture.ventas.ventas.size).toBe(1);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('aísla pedidos bloqueados sin impedir los siguientes', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.client.orders = [
      createOrder(21),
      createOrder(22, {
        items: [createItem({ localizador: '999' })],
      }),
      createOrder(23),
    ];

    const result = await fixture.service.importPage(20);

    expect(result.pedidos.map((pedido) => pedido.estado)).toEqual([
      'fiscal-step-completed',
      'blocked',
      'fiscal-step-completed',
    ]);

    expect(fixture.ventas.ventas.size).toBe(2);
    expect(fixture.fiscal.processedIds).toEqual([1, 2]);

    expect(result.nextAfterId).toBe(23);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('no ejecuta TicketBAI cuando falla el guardado', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.ventas.failNext = true;
    fixture.client.orders = [createOrder(31), createOrder(32)];

    const result = await fixture.service.importPage(30);

    expect(result.pedidos[0]).toMatchObject({
      orderId: 31,
      estado: 'persistence-error',
      ventaId: null,
    });

    expect(result.pedidos[1]).toMatchObject({
      orderId: 32,
      estado: 'fiscal-step-completed',
      ventaId: 1,
    });

    expect(fixture.events).toEqual(['save', 'save', 'fiscal:1']);

    expect(fixture.ventas.ventas.size).toBe(1);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('conserva la venta si falla TicketBAI', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.fiscal.failNext = true;
    fixture.client.orders = [createOrder(41), createOrder(42)];

    const result = await fixture.service.importPage(40);

    expect(result.pedidos[0]).toMatchObject({
      orderId: 41,
      estado: 'fiscal-error',
      ventaId: 1,
      error: 'Fallo del servicio fiscal.',
    });

    expect(result.pedidos[1]).toMatchObject({
      orderId: 42,
      estado: 'fiscal-step-completed',
      ventaId: 2,
    });

    expect(fixture.ventas.ventas.size).toBe(2);
    expect(fixture.fiscal.processedIds).toEqual([1, 2]);

    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('reutiliza la identidad local al procesar de nuevo un pedido', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.client.orders = [createOrder(51)];

    const first = await fixture.service.importPage(50);
    const second = await fixture.service.importPage(50);

    expect(first.pedidos[0]?.ventaId).toBe(1);
    expect(second.pedidos[0]?.ventaId).toBe(1);

    expect(fixture.ventas.ventas.size).toBe(1);

    /*
     * El servicio fiscal se consulta de nuevo por la
     * misma venta; su implementación real evita repetir
     * un envío inicial ya concluido.
     */
    expect(fixture.fiscal.processedIds).toEqual([1, 1]);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('bloquea transportes sin IVA histórico', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.client.orders = [
      createOrder(61, {
        shippingCents: 450,
        totalCents: 1_450,
      }),
    ];

    const result = await fixture.service.importPage(60);

    expect(result.pedidos[0]?.estado).toBe('blocked');

    expect(fixture.ventas.ventas.size).toBe(0);
    expect(fixture.fiscal.processedIds).toEqual([]);
    expect(fixture.client.acknowledgements).toEqual([]);
  });

  it('propaga fallos globales de descarga sin guardar nada', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.client.failPending = true;

    await expect(fixture.service.importPage(0)).rejects.toThrow('Fallo de conexión.');

    expect(fixture.ventas.ventas.size).toBe(0);
    expect(fixture.fiscal.processedIds).toEqual([]);
    expect(fixture.client.acknowledgements).toEqual([]);
  });
});
