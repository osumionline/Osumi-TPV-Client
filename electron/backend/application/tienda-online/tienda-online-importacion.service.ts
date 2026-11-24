import {
  TiendaOnlinePedidosService,
  type TiendaOnlinePaginaComandos,
} from '@backend/application/tienda-online/tienda-online-pedidos.service';
import { TiendaOnlineVentaCommandBuilder } from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import type VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';

/**
 * Fase alcanzada por el procesamiento de un pedido.
 *
 * fiscal-step-completed NO significa necesariamente que
 * TicketBAI haya aceptado la factura; solamente indica
 * que processInitial terminó sin lanzar una excepción.
 */
export type TiendaOnlineImportacionEstado =
  'blocked' | 'persistence-error' | 'fiscal-error' | 'fiscal-step-completed';

/** Resultado de procesar individualmente un pedido remoto. */
export interface TiendaOnlineImportacionPedidoResultado {
  readonly orderId: number;
  readonly reference: string;
  readonly estado: TiendaOnlineImportacionEstado;

  /** Identificador local, NULL si no se ha persistido. */
  readonly ventaId: number | null;

  readonly error: string | null;
}

/** Resultado de una página, sin cursor persistido ni ACK. */
export interface TiendaOnlineImportacionPaginaResultado {
  readonly afterId: number;
  readonly nextAfterId: number;
  readonly hasMore: boolean;
  readonly pedidos: readonly TiendaOnlineImportacionPedidoResultado[];
}

/**
 * Orquesta la persistencia comercial y el primer paso fiscal
 * de pedidos procedentes de tiendas online compatibles.
 *
 * Cada pedido se procesa independientemente y los errores
 * posteriores al COMMIT no revierten la venta.
 *
 * No realiza ACK ni modifica un cursor persistente.
 */
export class TiendaOnlineImportacionService {
  constructor(
    private readonly pedidosService: Pick<TiendaOnlinePedidosService, 'prepareCommandsPage'>,
    private readonly commandBuilder: TiendaOnlineVentaCommandBuilder,
    private readonly ventasRepository: Pick<VentasPersistenciaRepository, 'saveOnline'>,
    private readonly ticketBaiService: Pick<VentasTicketBaiService, 'processInitial'>,
  ) {}

  /**
   * Descarga y procesa una página de pedidos.
   *
   * La preparación ocurre antes de cualquier escritura.
   * Un pedido bloqueado no se guarda ni se fiscaliza.
   *
   * Un fallo comercial o fiscal se aísla para permitir
   * procesar los siguientes pedidos de la misma página.
   *
   * El cursor devuelto es informativo: no constituye
   * una confirmación de sincronización.
   */
  async importPage(afterId: number = 0): Promise<TiendaOnlineImportacionPaginaResultado> {
    const page: TiendaOnlinePaginaComandos = await this.pedidosService.prepareCommandsPage(
      this.commandBuilder,
      afterId,
    );

    const pedidos: TiendaOnlineImportacionPedidoResultado[] = [];

    for (const prepared of page.pedidos) {
      if (prepared.status === 'blocked') {
        pedidos.push({
          orderId: prepared.order.id,
          reference: prepared.order.reference,
          estado: 'blocked',
          ventaId: null,
          error: prepared.error,
        });

        continue;
      }

      let venta: VentaPersistidaRecord;

      try {
        /*
         * saveOnline es transaccional e idempotente.
         * Si devuelve una venta, su COMMIT comercial
         * ya se ha completado.
         */
        venta = await this.ventasRepository.saveOnline(prepared.command);
      } catch (error: unknown) {
        pedidos.push({
          orderId: prepared.order.id,
          reference: prepared.order.reference,
          estado: 'persistence-error',
          ventaId: null,
          error: this.getErrorMessage(error, 'No se ha podido guardar la venta online.'),
        });

        continue;
      }

      try {
        /*
         * TicketBAI solo se procesa después del
         * COMMIT comercial.
         *
         * processInitial controla sus propios estados
         * e impide repetir indebidamente un envío inicial.
         */
        await this.ticketBaiService.processInitial(venta.id);
      } catch (error: unknown) {
        pedidos.push({
          orderId: prepared.order.id,
          reference: prepared.order.reference,
          estado: 'fiscal-error',
          ventaId: venta.id,
          error: this.getErrorMessage(
            error,
            'No se ha podido completar el procesamiento TicketBAI.',
          ),
        });

        continue;
      }

      pedidos.push({
        orderId: prepared.order.id,
        reference: prepared.order.reference,
        estado: 'fiscal-step-completed',
        ventaId: venta.id,
        error: null,
      });
    }

    return {
      afterId: page.afterId,
      nextAfterId: page.nextAfterId,
      hasMore: page.hasMore,
      pedidos,
    };
  }

  /**
   * Normaliza un error sin asumir que todos los
   * rechazos asíncronos son instancias de Error.
   */
  private getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
  }
}
