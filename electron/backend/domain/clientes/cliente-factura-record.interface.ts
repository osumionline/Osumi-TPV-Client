export type ClienteFacturaEstadoRecord = 'borrador' | 'emitida' | 'anulada';

export interface ClienteFacturaRecord {
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number | null;
  readonly year: number | null;
  readonly estado: ClienteFacturaEstadoRecord;
  readonly importeCents: number;
  readonly fechaCreacion: string;
  readonly fechaEmision: string | null;
  readonly fechaAnulacion: string | null;
}
