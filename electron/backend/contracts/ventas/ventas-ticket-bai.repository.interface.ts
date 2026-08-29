import type {
  InitializeVentaTicketBaiPendingRecordCommand,
  MarkVentaTicketBaiAcceptedRecordCommand,
  MarkVentaTicketBaiFailureRecordCommand,
  MarkVentaTicketBaiReconciledRejectedRecordCommand,
  MarkVentaTicketBaiRemotePendingRecordCommand,
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
   * Persiste un resultado remoto pendiente que ya
   * contiene el artefacto fiscal TicketBAI.
   */
  markRemotePending(
    command: MarkVentaTicketBaiRemotePendingRecordCommand,
  ): Promise<VentaTicketBaiRecord>;

  /**
   * Persiste un ERROR observado durante una
   * reconciliación remota de TicketBAI.
   */
  markReconciledRejected(
    command: MarkVentaTicketBaiReconciledRejectedRecordCommand,
  ): Promise<VentaTicketBaiRecord>;

  /**
   * Confirma una aceptación remota y actualiza la
   * revisión documental solo si cambia el artefacto fiscal.
   */
  markAccepted(command: MarkVentaTicketBaiAcceptedRecordCommand): Promise<VentaTicketBaiRecord>;

  /**
   * Finaliza el intento actual con un resultado
   * de rechazo o error sin modificar el ticket.
   */
  markFailure(command: MarkVentaTicketBaiFailureRecordCommand): Promise<VentaTicketBaiRecord>;
}
