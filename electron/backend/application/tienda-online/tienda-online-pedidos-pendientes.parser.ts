import type {
  TiendaOnlineLineaPedido,
  TiendaOnlinePedidoPendiente,
  TiendaOnlinePedidosPendientesResponse,
} from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';

/**
 * Valida el contrato de pedidos pendientes de una tienda online.
 *
 * No conoce el proveedor, no consulta artículos locales
 * y no realiza operaciones de persistencia.
 */
export default class TiendaOnlinePedidosPendientesParser {
  /**
   * Convierte una respuesta externa desconocida
   * en pedidos pendientes estructuralmente válidos.
   */
  parse(payload: unknown): TiendaOnlinePedidosPendientesResponse {
    const data: Record<string, unknown> = this.requireObject(payload, 'La respuesta');

    if (data['status'] !== 'ok' || data['version'] !== 1) {
      throw new Error('La versión o el estado de la respuesta de tienda online no es válido.');
    }

    const rawOrders: unknown = data['orders'];

    if (!Array.isArray(rawOrders) || rawOrders.length > 20) {
      throw new Error('La lista de pedidos de tienda online no es válida.');
    }

    const ids: Set<number> = new Set<number>();
    const references: Set<string> = new Set<string>();

    const orders: TiendaOnlinePedidoPendiente[] = rawOrders.map(
      (value: unknown): TiendaOnlinePedidoPendiente => {
        const order: TiendaOnlinePedidoPendiente = this.parseOrder(value);

        if (ids.has(order.id) || references.has(order.reference)) {
          throw new Error('La respuesta de tienda online contiene pedidos duplicados.');
        }

        ids.add(order.id);
        references.add(order.reference);

        return order;
      },
    );

    return {
      status: 'ok',
      version: 1,
      orders,
    };
  }

  /**
   * Valida la identidad, la fecha, los importes
   * y las líneas de un pedido remoto.
   */
  private parseOrder(value: unknown): TiendaOnlinePedidoPendiente {
    const data: Record<string, unknown> = this.requireObject(value, 'El pedido');

    const id: number = this.requireInteger(data['id'], 'ID del pedido', 1);

    const reference: string = this.requireText(data['reference'], 'Referencia del pedido', 200);

    if (reference !== reference.trim()) {
      throw new Error('La referencia externa del pedido no es válida.');
    }

    const paidAt: string = this.requireText(data['paidAt'], 'Fecha de pago', 19);

    this.validatePaidAt(paidAt);

    const paymentMethod: string = this.requireText(data['paymentMethod'], 'Método de pago', 100);

    const productsTotalCents: number = this.requireInteger(
      data['productsTotalCents'],
      'Total de productos',
      0,
    );

    const shippingCents: number = this.requireInteger(data['shippingCents'], 'Gastos de envío', 0);

    const totalCents: number = this.requireInteger(data['totalCents'], 'Total del pedido', 0);

    const rawItems: unknown = data['items'];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error('Un pedido de tienda online debe contener líneas.');
    }

    const items: TiendaOnlineLineaPedido[] = rawItems.map(
      (item: unknown): TiendaOnlineLineaPedido => this.parseItem(item),
    );

    let linesTotalCents: number = 0;

    for (const item of items) {
      linesTotalCents = this.safeAdd(linesTotalCents, item.lineTotalCents);
    }

    if (
      linesTotalCents !== productsTotalCents ||
      this.safeAdd(linesTotalCents, shippingCents) !== totalCents
    ) {
      throw new Error('Los importes del pedido de tienda online no cuadran.');
    }

    return {
      id,
      reference,
      paidAt,
      paymentMethod,
      productsTotalCents,
      shippingCents,
      totalCents,
      items,
    };
  }

  /**
   * Valida una línea comercial conservando los datos
   * históricos ausentes como NULL.
   */
  private parseItem(value: unknown): TiendaOnlineLineaPedido {
    const data: Record<string, unknown> = this.requireObject(value, 'La línea');

    const amountBeforeCents: number | null = this.nullableInteger(
      data['amountBeforeCents'],
      'Importe anterior al descuento',
      0,
    );

    const discountCents: number | null = this.nullableInteger(
      data['discountCents'],
      'Descuento',
      0,
    );

    const lineTotalCents: number = this.requireInteger(
      data['lineTotalCents'],
      'Importe final de línea',
      0,
    );

    if (
      amountBeforeCents !== null &&
      discountCents !== null &&
      amountBeforeCents - discountCents !== lineTotalCents
    ) {
      throw new Error('Los importes de una línea de tienda online no cuadran.');
    }

    return {
      productId: this.requireInteger(data['productId'], 'Producto', 1),
      sizeId: this.requireInteger(data['sizeId'], 'Talla', 0),
      colorId: this.requireInteger(data['colorId'], 'Color', 0),
      quantity: this.requireInteger(data['quantity'], 'Cantidad', 1),

      name: this.nullableText(data['name'], 'Nombre', 200),
      brand: this.nullableText(data['brand'], 'Marca', 100),
      localizador: this.nullableText(data['localizador'], 'Localizador', 50),
      ivaBps: this.nullableInteger(data['ivaBps'], 'IVA', 0, 10_000),

      amountBeforeCents,
      discountCents,
      lineTotalCents,
    };
  }

  /**
   * Exige un objeto JSON y rechaza arrays y NULL.
   */
  private requireObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${label} no es un objeto válido.`);
    }

    return value as Record<string, unknown>;
  }

  /**
   * Valida un número entero seguro dentro de un intervalo.
   */
  private requireInteger(
    value: unknown,
    label: string,
    minimum: number,
    maximum: number = Number.MAX_SAFE_INTEGER,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new Error(`${label} de tienda online no es válido.`);
    }

    return value;
  }

  /**
   * Acepta explícitamente NULL para importes o impuestos históricos.
   */
  private nullableInteger(
    value: unknown,
    label: string,
    minimum: number,
    maximum: number = Number.MAX_SAFE_INTEGER,
  ): number | null {
    return value === null ? null : this.requireInteger(value, label, minimum, maximum);
  }

  /**
   * Valida un texto requerido sin alterar su contenido.
   */
  private requireText(value: unknown, label: string, maximum: number): string {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
      throw new Error(`${label} de tienda online no es válido.`);
    }

    return value;
  }

  /**
   * Conserva un texto opcional o un snapshot NULL.
   */
  private nullableText(value: unknown, label: string, maximum: number): string | null {
    return value === null ? null : this.requireText(value, label, maximum);
  }

  /**
   * Comprueba que la fecha recibida sea un DATETIME real.
   *
   * Date.UTC solo se utiliza para validar el calendario.
   * No asignamos aquí una zona horaria al instante de pago.
   */
  private validatePaidAt(value: string): void {
    const match: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
      value,
    );

    if (match === null) {
      throw new Error('La fecha de pago de tienda online no tiene formato DATETIME.');
    }

    const year: number = Number(match[1]);
    const month: number = Number(match[2]);
    const day: number = Number(match[3]);
    const hour: number = Number(match[4]);
    const minute: number = Number(match[5]);
    const second: number = Number(match[6]);

    const date: Date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day ||
      date.getUTCHours() !== hour ||
      date.getUTCMinutes() !== minute ||
      date.getUTCSeconds() !== second
    ) {
      throw new Error('La fecha de pago de tienda online no es válida.');
    }
  }

  /**
   * Rechaza sumas que sobrepasen el rango entero seguro.
   */
  private safeAdd(first: number, second: number): number {
    const result: number = first + second;

    if (!Number.isSafeInteger(result)) {
      throw new Error('Los importes de tienda online superan el rango seguro.');
    }

    return result;
  }
}
