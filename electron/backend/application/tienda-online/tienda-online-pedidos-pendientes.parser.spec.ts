import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import type {
  TiendaOnlineLineaPedido,
  TiendaOnlinePedidoPendiente,
  TiendaOnlinePedidosPendientesResponse,
} from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import { describe, expect, it } from 'vitest';

const parser: TiendaOnlinePedidosPendientesParser = new TiendaOnlinePedidosPendientesParser();

/**
 * Crea una línea comercial completa de ejemplo.
 */
function createLine(): TiendaOnlineLineaPedido {
  return {
    productId: 57,
    sizeId: 0,
    colorId: 0,
    quantity: 2,
    name: 'Artículo de prueba',
    brand: 'Marca de prueba',
    localizador: '000123',
    ivaBps: 2_100,
    amountBeforeCents: 2_700,
    discountCents: 200,
    lineTotalCents: 2_500,
  };
}

/**
 * Crea un pedido remoto pagado de ejemplo.
 */
function createOrder(): TiendaOnlinePedidoPendiente {
  return {
    id: 123,
    reference: 'pedido-remoto-123',
    paidAt: '2026-11-12 14:30:00',
    paymentMethod: 'tarjeta',
    productsTotalCents: 2_500,
    shippingCents: 450,
    totalCents: 2_950,
    items: [createLine()],
  };
}

/**
 * Construye una respuesta del protocolo versión 1.
 */
function createResponse(
  orders: readonly TiendaOnlinePedidoPendiente[] = [createOrder()],
): TiendaOnlinePedidosPendientesResponse {
  return {
    status: 'ok',
    version: 1,
    orders,
  };
}

describe('TiendaOnlinePedidosPendientesParser', (): void => {
  it('acepta pedidos válidos de una tienda online', (): void => {
    const result = parser.parse(createResponse());

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.reference).toBe('pedido-remoto-123');
    expect(result.orders[0]?.items[0]?.localizador).toBe('000123');
    expect(result.orders[0]?.totalCents).toBe(2_950);
  });

  it('no presupone un proveedor ni un método de pago concreto', (): void => {
    const result = parser.parse(
      createResponse([
        {
          ...createOrder(),
          reference: 'ORDER-ABC-2026',
          paymentMethod: 'pasarela-externa',
        },
      ]),
    );

    expect(result.orders[0]?.reference).toBe('ORDER-ABC-2026');
    expect(result.orders[0]?.paymentMethod).toBe('pasarela-externa');
  });

  it('admite variantes y snapshots históricos ausentes', (): void => {
    const legacyLine: TiendaOnlineLineaPedido = {
      ...createLine(),
      sizeId: 14,
      colorId: 9,
      name: null,
      brand: null,
      localizador: null,
      ivaBps: null,
      amountBeforeCents: null,
      discountCents: null,
    };

    const result = parser.parse(
      createResponse([
        {
          ...createOrder(),
          items: [legacyLine],
        },
      ]),
    );

    expect(result.orders[0]?.items[0]).toEqual(legacyLine);
  });

  it('acepta una página de pedidos vacía', (): void => {
    expect(parser.parse(createResponse([])).orders).toEqual([]);
  });

  it('rechaza una versión de protocolo incompatible', (): void => {
    expect((): void => {
      parser.parse({
        ...createResponse(),
        version: 2,
      });
    }).toThrow('La versión o el estado');
  });

  it('rechaza pedidos duplicados por ID o referencia', (): void => {
    expect((): void => {
      parser.parse(createResponse([createOrder(), createOrder()]));
    }).toThrow('pedidos duplicados');

    expect((): void => {
      parser.parse(
        createResponse([
          createOrder(),
          {
            ...createOrder(),
            id: 124,
          },
        ]),
      );
    }).toThrow('pedidos duplicados');
  });

  it('rechaza importes de pedido inconsistentes', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            productsTotalCents: 2_400,
          },
        ]),
      );
    }).toThrow('Los importes del pedido');
  });

  it('rechaza importes de línea inconsistentes', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            items: [
              {
                ...createLine(),
                discountCents: 100,
              },
            ],
          },
        ]),
      );
    }).toThrow('Los importes de una línea');
  });

  it('rechaza fechas inexistentes', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            paidAt: '2026-02-30 14:30:00',
          },
        ]),
      );
    }).toThrow('La fecha de pago de tienda online no es válida');
  });

  it('rechaza pedidos sin líneas', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            items: [],
          },
        ]),
      );
    }).toThrow('debe contener líneas');
  });

  it('rechaza cantidades de artículos incorrectas', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            items: [
              {
                ...createLine(),
                quantity: -1,
              },
            ],
          },
        ]),
      );
    }).toThrow('Cantidad de tienda online no es válido');
  });

  it('rechaza referencias externas vacías', (): void => {
    expect((): void => {
      parser.parse(
        createResponse([
          {
            ...createOrder(),
            reference: '   ',
          },
        ]),
      );
    }).toThrow('Referencia del pedido');
  });

  it('rechaza páginas mayores de veinte pedidos', (): void => {
    const orders: TiendaOnlinePedidoPendiente[] = Array.from(
      { length: 21 },
      (_value: unknown, index: number): TiendaOnlinePedidoPendiente => ({
        ...createOrder(),
        id: index + 1,
        reference: `pedido-${index + 1}`,
      }),
    );

    expect((): void => {
      parser.parse(createResponse(orders));
    }).toThrow('La lista de pedidos');
  });
});
