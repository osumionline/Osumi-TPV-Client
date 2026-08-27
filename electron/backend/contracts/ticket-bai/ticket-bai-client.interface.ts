import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';

export interface TicketBaiClientConfiguration {
  readonly token: string;
  readonly issuerNif: string;
  readonly environment: TicketBaiEnvironment;
}

export interface TicketBaiInvoiceLine {
  readonly descripcion: string;
  readonly cantidad: number;
  readonly importeUnitario: number;
  readonly tipoIva: number;
  readonly tipoReq: number;
}

export interface TicketBaiCreateInvoiceRequest {
  readonly fecha: string;
  readonly hora: string;
  readonly simplificada: boolean;
  readonly serie: string;
  readonly numero: string;
  readonly rectificativa: boolean;
  readonly retencion: number;
  readonly modoRecargoEquivalencia: boolean;
  readonly lineas: readonly TicketBaiInvoiceLine[];
  readonly totalFactura: number;
}

export interface TicketBaiCreateInvoiceResult {
  readonly huella: string;
  readonly qr: string;
  readonly url: string;
  readonly responsePayload: string;
}

export interface TicketBaiClient {
  /**
   * Crea una factura simplificada mediante
   * el proveedor TicketBAI configurado.
   */
  createInvoice(
    configuration: TicketBaiClientConfiguration,
    request: TicketBaiCreateInvoiceRequest,
  ): Promise<TicketBaiCreateInvoiceResult>;
}
