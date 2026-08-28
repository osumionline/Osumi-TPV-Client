import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';

export type VentaTicketBaiEstado =
  | 'no_aplica'
  | 'legacy'
  | 'pendiente'
  | 'enviando'
  | 'aceptada'
  | 'rechazada'
  | 'error_temporal'
  | 'error_permanente'
  | 'anulada';

export type VentaTicketBaiFailureEstado = 'rechazada' | 'error_temporal' | 'error_permanente';

export interface VentaTicketBaiRecord {
  readonly idVenta: number;

  readonly entorno: TicketBaiEnvironment | null;

  readonly nifEmisor: string | null;
  readonly serie: string | null;
  readonly numero: string | null;

  readonly estado: VentaTicketBaiEstado;

  readonly identificador: string | null;
  readonly huella: string | null;
  readonly qr: string | null;
  readonly url: string | null;

  readonly intentos: number;
  readonly ultimoError: string | null;

  readonly solicitudPayload: string | null;
  readonly respuestaPayload: string | null;

  readonly enviadoAt: string | null;
  readonly aceptadoAt: string | null;

  readonly createdAt: string;
  readonly updatedAt: string;
}
