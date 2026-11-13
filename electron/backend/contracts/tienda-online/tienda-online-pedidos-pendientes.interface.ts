/**
 * Línea comercial recibida desde una tienda online.
 *
 * Los importes corresponden a la venta original
 * y se expresan en céntimos.
 */
export interface TiendaOnlineLineaPedido {
  readonly productId: number;
  readonly sizeId: number;
  readonly colorId: number;
  readonly quantity: number;

  readonly name: string | null;
  readonly brand: string | null;
  readonly localizador: string | null;
  readonly ivaBps: number | null;

  readonly amountBeforeCents: number | null;
  readonly discountCents: number | null;
  readonly lineTotalCents: number;
}

/**
 * Pedido pagado pendiente de importar al TPV.
 *
 * reference identifica el pedido en el backend remoto.
 * paidAt es una fecha civil local, todavía sin zona horaria.
 */
export interface TiendaOnlinePedidoPendiente {
  readonly id: number;
  readonly reference: string;
  readonly paidAt: string;
  readonly paymentMethod: string;

  readonly productsTotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;

  readonly items: readonly TiendaOnlineLineaPedido[];
}

/**
 * Contrato HTTP común para los backends compatibles
 * con la sincronización de tiendas online.
 */
export interface TiendaOnlinePedidosPendientesResponse {
  readonly status: 'ok';
  readonly version: 1;
  readonly orders: readonly TiendaOnlinePedidoPendiente[];
}
