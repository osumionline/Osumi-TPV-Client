import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import type { TiendaOnlineVentaCommandBuilder } from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import type { TiendaOnlinePedidoPendiente } from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
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
 * Pedido con comando comercial completo y validado.
 *
 * Todavía no está guardado en SQLite.
 */
export interface TiendaOnlinePedidoConComando {
  readonly status: 'command-ready';
  readonly order: TiendaOnlinePedidoPendiente;
  readonly command: GuardarVentaOnlineRecordCommand;
}

export type TiendaOnlinePreparacionComando =
  TiendaOnlinePedidoConComando | TiendaOnlinePedidoBloqueado;

/** Resultado comercial completo de una página remota. */
export interface TiendaOnlinePaginaComandos {
  readonly afterId: number;
  readonly nextAfterId: number;
  readonly hasMore: boolean;
  readonly pedidos: readonly TiendaOnlinePreparacionComando[];
}

/**
 * Coordina la consulta y la preparación de pedidos online.
 *
 * Un pedido que no puede prepararse no impide examinar
 * los restantes. No persiste ventas ni confirma pedidos.
 */
export class TiendaOnlinePedidosService {
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

  /**
   * Descarga una página y construye comandos de venta completos.
   *
   * Reutiliza la preparación existente y aísla los errores
   * comerciales por pedido. No realiza persistencia ni ACK.
   */
  async prepareCommandsPage(
    commandBuilder: TiendaOnlineVentaCommandBuilder,
    afterId: number = 0,
  ): Promise<TiendaOnlinePaginaComandos> {
    const page: TiendaOnlinePaginaPreparada = await this.preparePage(afterId);

    const pedidos: TiendaOnlinePreparacionComando[] = [];

    for (const prepared of page.pedidos) {
      if (prepared.status === 'blocked') {
        pedidos.push(prepared);
        continue;
      }

      try {
        const command: GuardarVentaOnlineRecordCommand = await commandBuilder.build(prepared);

        pedidos.push({
          status: 'command-ready',
          order: prepared.order,
          command,
        });
      } catch (error: unknown) {
        pedidos.push({
          status: 'blocked',
          order: prepared.order,
          error:
            error instanceof Error ? error.message : 'No se ha podido construir la venta online.',
        });
      }
    }

    return {
      afterId: page.afterId,
      nextAfterId: page.nextAfterId,
      hasMore: page.hasMore,
      pedidos,
    };
  }
}
