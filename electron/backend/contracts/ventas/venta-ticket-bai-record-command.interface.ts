import type { VentaTicketBaiFailureEstado } from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';

export interface InitializeVentaTicketBaiPendingRecordCommand {
  readonly idVenta: number;
  readonly entorno: TicketBaiEnvironment;
  readonly nifEmisor: string;
  readonly serie: string;
  readonly numero: string;
  readonly solicitudPayload: string;
}

export interface MarkVentaTicketBaiRemotePendingRecordCommand {
  readonly idVenta: number;
  readonly huella: string;
  readonly qr: string;
  readonly url: string;
  readonly respuestaPayload: string;
}

export interface MarkVentaTicketBaiAcceptedRecordCommand {
  readonly idVenta: number;
  readonly huella: string;
  readonly qr: string;
  readonly url: string;
  readonly respuestaPayload: string;
}

export interface MarkVentaTicketBaiFailureRecordCommand {
  readonly idVenta: number;
  readonly estado: VentaTicketBaiFailureEstado;
  readonly ultimoError: string;
  readonly respuestaPayload: string | null;
}
