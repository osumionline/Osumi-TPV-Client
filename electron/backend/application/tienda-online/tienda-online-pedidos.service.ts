import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import type { TiendaOnlinePedidoPendiente } from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type { GuardarVentaLineaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';

/**
 * Pedido cuyas líneas ya se han transformado correctamente.
 *
 * El pago, la fecha fiscal y el envío siguen pendientes
 * del futuro constructor del comando completo.
 */
export interface TiendaOnlinePedidoConLineas {
  readonly status: 'lines-ready';
  readonly order: TiendaOnlinePedidoPendiente;
  readonly lineas: readonly GuardarVentaLineaRecordCommand[];
}

/** Pedido que no puede continuar sin corregir una incidencia. */
export interface TiendaOnlinePedidoBloqueado {
  readonly status: 'blocked';
  readonly order: TiendaOnlinePedidoPendiente;
  readonly error: string;
}

export type TiendaOnlinePedidoPreparacion =
  TiendaOnlinePedidoConLineas | TiendaOnlinePedidoBloqueado;

/** Resultado de preparar una página remota. */
export interface TiendaOnlinePaginaPreparada {
  readonly afterId: number;
  readonly nextAfterId: number;
  readonly hasMore: boolean;
  readonly pedidos: readonly TiendaOnlinePedidoPreparacion[];
}

/**
 * Coordina la consulta y la preparación de pedidos online.
 *
 * Un pedido que no puede prepararse no impide examinar
 * los restantes. No persiste ventas ni confirma pedidos.
 */
export default class TiendaOnlinePedidosService {
  constructor(
    private readonly client: TiendaOnlinePedidosClient,
    private readonly parser: TiendaOnlinePedidosPendientesParser,
    private readonly lineasMapper: TiendaOnlineLineasMapper,
  ) {}

  /**
   * Descarga y prepara una página de hasta veinte pedidos.
   *
   * Comprueba que el backend respeta el cursor ascendente.
   * Las incidencias de una línea se aíslan por pedido.
   */
  async preparePage(afterId: number = 0): Promise<TiendaOnlinePaginaPreparada> {
    if (!Number.isSafeInteger(afterId) || afterId < 0) {
      throw new Error('El cursor de pedidos no es válido.');
    }

    const payload: unknown = await this.client.pending(afterId);
    const response = this.parser.parse(payload);

    let nextAfterId: number = afterId;

    const pedidos: TiendaOnlinePedidoPreparacion[] = [];

    for (const order of response.orders) {
      if (order.id <= nextAfterId) {
        throw new Error('La tienda online ha devuelto pedidos fuera del orden del cursor.');
      }

      nextAfterId = order.id;

      try {
        const lineas: readonly GuardarVentaLineaRecordCommand[] = await this.lineasMapper.map(
          order.items,
        );

        pedidos.push({
          status: 'lines-ready',
          order,
          lineas,
        });
      } catch (error: unknown) {
        pedidos.push({
          status: 'blocked',
          order,
          error:
            error instanceof Error
              ? error.message
              : 'No se han podido preparar las líneas del pedido.',
        });
      }
    }

    return {
      afterId,
      nextAfterId,
      hasMore: response.orders.length === 20,
      pedidos,
    };
  }
}
