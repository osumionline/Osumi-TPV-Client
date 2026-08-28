import type {
  InitializeVentaTicketBaiPendingRecordCommand,
  MarkVentaTicketBaiAcceptedRecordCommand,
  MarkVentaTicketBaiFailureRecordCommand,
} from '@backend/contracts/ventas/venta-ticket-bai-record-command.interface';
import type { VentaTicketBaiRecord } from '@backend/domain/ventas/venta-ticket-bai-record.interface';

export default interface VentasTicketBaiRepository {
  /**
   * Recupera el estado TicketBAI asociado a una venta.
   */
  findByVentaId(idVenta: number): Promise<VentaTicketBaiRecord | null>;

  /**
   * Inicializa idempotentemente una venta
   * para la que TicketBAI no aplica.
   */
  initializeNoAplica(idVenta: number): Promise<VentaTicketBaiRecord>;

  /**
   * Inicializa idempotentemente la identidad fiscal
   * y el payload de una venta pendiente de envío.
   */
  initializePending(
    command: InitializeVentaTicketBaiPendingRecordCommand,
  ): Promise<VentaTicketBaiRecord>;

  /**
   * Adquiere de forma atómica el primer intento.
   *
   * Solo puede pasar de pendiente a enviando.
   */
  beginInitialAttempt(idVenta: number): Promise<VentaTicketBaiRecord | null>;

  /**
   * Adquiere de forma atómica un intento manual.
   *
   * Solo parte de un estado de error/rechazo.
   */
  beginManualAttempt(idVenta: number): Promise<VentaTicketBaiRecord | null>;

  /**
   * Confirma una aceptación y hace obsoleto
   * el PDF anterior incrementando ticket_revision.
   */
  markAccepted(command: MarkVentaTicketBaiAcceptedRecordCommand): Promise<VentaTicketBaiRecord>;

  /**
   * Finaliza el intento actual con un resultado
   * de rechazo o error sin modificar el ticket.
   */
  markFailure(command: MarkVentaTicketBaiFailureRecordCommand): Promise<VentaTicketBaiRecord>;
}
