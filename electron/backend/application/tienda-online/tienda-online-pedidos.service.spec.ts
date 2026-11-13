import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import type { TiendaOnlinePaginaPreparada } from '@backend/application/tienda-online/tienda-online-pedidos.service';
import TiendaOnlinePedidosService from '@backend/application/tienda-online/tienda-online-pedidos.service';
import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type {
  TiendaOnlineLineaPedido,
  TiendaOnlinePedidoPendiente,
} from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';
import { describe, expect, it } from 'vitest';

/** Simula el backend remoto sin utilizar HTTP real. */
class FakePedidosClient implements TiendaOnlinePedidosClient {
  payload: unknown = null;
  readonly cursors: number[] = [];
  readonly acknowledgements: number[] = [];

  pending(afterId: number): Promise<unknown> {
    this.cursors.push(afterId);
    return Promise.resolve(this.payload);
  }

  acknowledge(orderId: number): Promise<void> {
    this.acknowledgements.push(orderId);
    return Promise.resolve();
  }
}

/** Simula las consultas exactas de artículos locales. */
class FakeArticulosRepository implements TiendaOnlineArticulosRepository {
  readonly articles: Map<number, ArticuloVentaRecord> = new Map<number, ArticuloVentaRecord>();

  findByLocalizador(localizador: number): Promise<ArticuloVentaRecord | null> {
    return Promise.resolve(this.articles.get(localizador) ?? null);
  }
}

/** Artículo existente en el TPV. */
function createArticle(): ArticuloVentaRecord {
  return {
    id: 10,
    publicId: 'articulo-10',
    localizador: 123,
    nombre: 'Artículo TPV',
    marca: 'Marca TPV',
    pucMicros: 500_000,
    pvpCents: 1_500,
    pvpDescuentoCents: null,
    ivaBps: 2_100,
    stock: 10,
    fechaCaducidad: null,
    observaciones: null,
    mostrarObservacionesVentas: false,
  };
}

/** Línea comercial recibida de la tienda. */
function createItem(overrides: Partial<TiendaOnlineLineaPedido> = {}): TiendaOnlineLineaPedido {
  return {
    productId: 57,
    sizeId: 0,
    colorId: 0,
    quantity: 2,
    name: 'Artículo histórico',
    brand: 'Marca histórica',
    localizador: '000123',
    ivaBps: 2_100,
    amountBeforeCents: 2_700,
    discountCents: 200,
    lineTotalCents: 2_500,
    ...overrides,
  };
}

/** Pedido pagado completo para la consulta. */
function createOrder(
  id: number,
  item: TiendaOnlineLineaPedido = createItem(),
): TiendaOnlinePedidoPendiente {
  return {
    id,
    reference: `pedido-online-${id}`,
    paidAt: '2026-11-13 10:30:00',
    paymentMethod: 'tarjeta',
    productsTotalCents: item.lineTotalCents,
    shippingCents: 0,
    totalCents: item.lineTotalCents,
    items: [item],
  };
}

/** Respuesta conforme al protocolo versión 1. */
function createPayload(orders: readonly TiendaOnlinePedidoPendiente[]): unknown {
  return {
    status: 'ok',
    version: 1,
    orders,
  };
}

/** Construye el servicio real con dependencias controladas. */
function createService(
  client: FakePedidosClient,
  repository: FakeArticulosRepository,
): TiendaOnlinePedidosService {
  return new TiendaOnlinePedidosService(
    client,
    new TiendaOnlinePedidosPendientesParser(),
    new TiendaOnlineLineasMapper(new TiendaOnlineArticuloResolver(repository)),
  );
}

describe('TiendaOnlinePedidosService', (): void => {
  it('descarga y prepara una página completa', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    repository.articles.set(123, createArticle());

    client.payload = createPayload([createOrder(11), createOrder(12)]);

    const result: TiendaOnlinePaginaPreparada = await createService(client, repository).preparePage(
      10,
    );

    expect(client.cursors).toEqual([10]);
    expect(result.afterId).toBe(10);
    expect(result.nextAfterId).toBe(12);
    expect(result.hasMore).toBe(false);
    expect(result.pedidos).toHaveLength(2);

    expect(result.pedidos[0]?.status).toBe('lines-ready');

    const first = result.pedidos[0];

    if (first?.status !== 'lines-ready') {
      throw new Error('El primer pedido debería haberse preparado.');
    }

    expect(first.lineas[0]).toMatchObject({
      articuloPublicId: 'articulo-10',
      localizador: 123,
      nombre: 'Artículo histórico',
      pvpMicros: 13_500_000,
      importeMicros: 25_000_000,
      descuentoBps: 0,
      importeDescuentoMicros: 2_000_000,
    });

    // Preparar no modifica ni confirma pedidos remotos.
    expect(client.acknowledgements).toEqual([]);
  });

  it('aísla un pedido bloqueado sin perder los demás', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    repository.articles.set(123, createArticle());

    client.payload = createPayload([
      createOrder(21),
      createOrder(
        22,
        createItem({
          localizador: '999',
        }),
      ),
      createOrder(23),
    ]);

    const result = await createService(client, repository).preparePage(20);

    expect(result.pedidos.map((pedido) => pedido.status)).toEqual([
      'lines-ready',
      'blocked',
      'lines-ready',
    ]);

    const blocked = result.pedidos[1];

    if (blocked?.status !== 'blocked') {
      throw new Error('El segundo pedido debería estar bloqueado.');
    }

    expect(blocked.order.id).toBe(22);
    expect(blocked.error).toContain('No existe un artículo local');

    expect(result.nextAfterId).toBe(23);
    expect(client.acknowledgements).toEqual([]);
  });

  it('detecta respuestas fuera del orden del cursor', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    client.payload = createPayload([createOrder(9)]);

    await expect(createService(client, repository).preparePage(10)).rejects.toThrow(
      'fuera del orden del cursor',
    );
  });

  it('rechaza respuestas de protocolo inválidas', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    client.payload = {
      status: 'ok',
      version: 2,
      orders: [],
    };

    await expect(createService(client, repository).preparePage()).rejects.toThrow(
      'La versión o el estado',
    );

    expect(client.acknowledgements).toEqual([]);
  });

  it('devuelve una página vacía sin avanzar el cursor', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    client.payload = createPayload([]);

    const result = await createService(client, repository).preparePage(100);

    expect(result.pedidos).toEqual([]);
    expect(result.nextAfterId).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it('marca correctamente la existencia de otra página', async (): Promise<void> => {
    const client = new FakePedidosClient();
    const repository = new FakeArticulosRepository();

    repository.articles.set(123, createArticle());

    client.payload = createPayload(
      Array.from({ length: 20 }, (_value: unknown, index: number): TiendaOnlinePedidoPendiente =>
        createOrder(index + 1),
      ),
    );

    const result = await createService(client, repository).preparePage();

    expect(result.pedidos).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextAfterId).toBe(20);
    expect(client.acknowledgements).toEqual([]);
  });
});
