import type {
  TiendaOnlineImportacionPedidoResultado,
  TiendaOnlineImportacionPaginaResultado,
  TiendaOnlineImportacionService,
} from '@backend/application/tienda-online/tienda-online-importacion.service';
import type VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type {
  VentaTicketBaiEstado,
  VentaTicketBaiRecord,
} from '@backend/domain/ventas/venta-ticket-bai-record.interface';

/**
 * Política explícita que establece cuándo puede
 * confirmarse un pedido al backend de tienda online.
 */
export type TiendaOnlineAckPolitica = 'solo-aceptada' | 'aceptada-o-no-aplica';

/** Resultado final del procesamiento de un pedido. */
export type TiendaOnlineSincronizacionEstado =
  | 'blocked'
  | 'persistence-error'
  | 'fiscal-error'
  | 'fiscal-not-ready'
  | 'ack-error'
  | 'acknowledged';

/** Resultado individual, sin incluir datos personales. */
export interface TiendaOnlineSincronizacionPedidoResultado {
  readonly orderId: number;
  readonly reference: string;
  readonly ventaId: number | null;
  readonly estado: TiendaOnlineSincronizacionEstado;
  readonly estadoFiscal: VentaTicketBaiEstado | null;
  readonly error: string | null;
}

/** Resumen de una ejecución de sincronización. */
export interface TiendaOnlineSincronizacionResultado {
  readonly paginas: number;
  readonly cursorFinal: number;
  readonly limiteAlcanzado: boolean;
  readonly pedidos: readonly TiendaOnlineSincronizacionPedidoResultado[];
}

/**
 * Ejecuta una pasada de sincronización de pedidos online.
 *
 * Reutiliza el importador comercial existente y consulta
 * el estado TicketBAI persistido antes de cualquier ACK.
 *
 * No utiliza cursores permanentes ni planifica ejecuciones.
 */
export class TiendaOnlineSincronizacionService {
  constructor(
    private readonly importacionService: Pick<TiendaOnlineImportacionService, 'importPage'>,
    private readonly fiscalRepository: Pick<VentasTicketBaiRepository, 'findByVentaId'>,
    private readonly fiscalService: Pick<VentasTicketBaiService, 'reconcile'>,
    private readonly pedidosClient: Pick<TiendaOnlinePedidosClient, 'acknowledge'>,
    private readonly politicaAck: TiendaOnlineAckPolitica,
  ) {
    if (politicaAck !== 'solo-aceptada' && politicaAck !== 'aceptada-o-no-aplica') {
      throw new Error('La política de confirmación de pedidos online no es válida.');
    }
  }

  /**
   * Ejecuta una pasada completa desde el primer pedido pendiente.
   *
   * El cursor es temporal y solo sirve para paginar durante
   * esta ejecución. Nunca queda guardado como punto de reanudación.
   *
   * Los pedidos que no reciben ACK permanecen pendientes
   * en el servidor y volverán a aparecer en otra ejecución.
   *
   * @param maxPaginas Límite de páginas para una ejecución.
   */
  async runOnce(maxPaginas: number = 25): Promise<TiendaOnlineSincronizacionResultado> {
    if (!Number.isSafeInteger(maxPaginas) || maxPaginas < 1 || maxPaginas > 100) {
      throw new Error('El límite de páginas de sincronización no es válido.');
    }

    const pedidos: TiendaOnlineSincronizacionPedidoResultado[] = [];

    let paginas: number = 0;
    let afterId: number = 0;

    while (paginas < maxPaginas) {
      const page: TiendaOnlineImportacionPaginaResultado =
        await this.importacionService.importPage(afterId);

      this.validatePage(page, afterId);

      paginas += 1;

      for (const pedido of page.pedidos) {
        pedidos.push(await this.processResult(pedido));
      }

      afterId = page.nextAfterId;

      if (!page.hasMore) {
        return {
          paginas,
          cursorFinal: afterId,
          limiteAlcanzado: false,
          pedidos,
        };
      }
    }

    return {
      paginas,
      cursorFinal: afterId,
      limiteAlcanzado: true,
      pedidos,
    };
  }

  /**
   * Comprueba que una página respeta el cursor ascendente
   * y que no hay saltos incoherentes en sus resultados.
   */
  private validatePage(page: TiendaOnlineImportacionPaginaResultado, afterId: number): void {
    if (
      page.afterId !== afterId ||
      !Number.isSafeInteger(page.nextAfterId) ||
      page.nextAfterId < afterId ||
      page.pedidos.length > 20
    ) {
      throw new Error('La paginación de la tienda online no es coherente.');
    }

    let lastId: number = afterId;

    for (const pedido of page.pedidos) {
      if (!Number.isSafeInteger(pedido.orderId) || pedido.orderId <= lastId) {
        throw new Error('Los pedidos de la página no están ordenados correctamente.');
      }

      lastId = pedido.orderId;
    }

    if (lastId !== page.nextAfterId || (page.hasMore && lastId === afterId)) {
      throw new Error('El cursor de la página no coincide con los pedidos recibidos.');
    }
  }

  /**
   * Determina si un pedido puede confirmarse.
   *
   * Nunca confirma una venta que no ha completado
   * satisfactoriamente su paso comercial y fiscal.
   */
  private async processResult(
    pedido: TiendaOnlineImportacionPedidoResultado,
  ): Promise<TiendaOnlineSincronizacionPedidoResultado> {
    const base = {
      orderId: pedido.orderId,
      reference: pedido.reference,
      ventaId: pedido.ventaId,
    };

    /*
     * Un fallo durante la importación impide el ACK.
     *
     * Especialmente ante fiscal-error, conservamos
     * la venta pero esperamos a una nueva ejecución
     * para evaluar otra vez su estado fiscal.
     */
    if (pedido.estado !== 'fiscal-step-completed') {
      return {
        ...base,
        estado: pedido.estado,
        estadoFiscal: null,
        error: pedido.error,
      };
    }

    const ventaId: number | null = pedido.ventaId;

    if (ventaId === null || !Number.isSafeInteger(ventaId) || ventaId <= 0) {
      return {
        ...base,
        estado: 'fiscal-error',
        estadoFiscal: null,
        error: 'La venta online no tiene un identificador local válido.',
      };
    }

    let fiscal: VentaTicketBaiRecord | null = null;

    try {
      fiscal = await this.fiscalRepository.findByVentaId(ventaId);

      /*
       * Solo reconciliamos estados para los que el
       * servicio fiscal ya contempla esta operación.
       *
       * No efectuamos reintentos automáticos de facturas
       * rechazadas ni nuevos envíos iniciales.
       */
      if (fiscal !== null && this.requiresReconciliation(fiscal.estado)) {
        await this.fiscalService.reconcile(ventaId);

        fiscal = await this.fiscalRepository.findByVentaId(ventaId);
      }
    } catch (error: unknown) {
      return {
        ...base,
        estado: 'fiscal-error',
        estadoFiscal: fiscal?.estado ?? null,
        error: this.errorMessage(error, 'No se ha podido consultar el estado fiscal de la venta.'),
      };
    }

    const estadoFiscal: VentaTicketBaiEstado | null = fiscal?.estado ?? null;

    if (!this.canAcknowledge(estadoFiscal)) {
      return {
        ...base,
        estado: 'fiscal-not-ready',
        estadoFiscal,
        error: estadoFiscal === null ? 'La venta no tiene un estado TicketBAI persistido.' : null,
      };
    }

    try {
      await this.pedidosClient.acknowledge(pedido.orderId);
    } catch (error: unknown) {
      return {
        ...base,
        estado: 'ack-error',
        estadoFiscal,
        error: this.errorMessage(error, 'No se ha podido confirmar el pedido en la tienda online.'),
      };
    }

    return {
      ...base,
      estado: 'acknowledged',
      estadoFiscal,
      error: null,
    };
  }

  /**
   * Indica si el registro fiscal puede consultarse
   * para resolver un resultado remoto pendiente.
   */
  private requiresReconciliation(estado: VentaTicketBaiEstado): boolean {
    return estado === 'enviando' || estado === 'pendiente_remoto' || estado === 'error_temporal';
  }

  /**
   * Aplica exclusivamente la política de ACK seleccionada.
   *
   * No se confirma ningún estado desconocido, ambiguo,
   * pendiente, rechazado o anulado.
   */
  private canAcknowledge(estado: VentaTicketBaiEstado | null): boolean {
    if (estado === 'aceptada') {
      return true;
    }

    return estado === 'no_aplica' && this.politicaAck === 'aceptada-o-no-aplica';
  }

  /** Extrae un mensaje de error seguro con valor alternativo. */
  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
  }
}
