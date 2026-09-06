import type { ClienteFacturaEstadoRecord } from '@backend/domain/clientes/cliente-factura-record.interface';

export interface ClienteFacturaDocumentoClienteRecord {
  readonly nombreApellidos: string;
  readonly dniCif: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provinciaId: number | null;
}

export interface ClienteFacturaDocumentoLineaRecord {
  readonly localizador: number;
  readonly marca: string;
  readonly nombre: string;
  readonly pvpMicros: number;
  readonly ivaBps: number;
  readonly importeMicros: number;
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
  readonly unidades: number;
  readonly regalo: boolean;
}

export interface ClienteFacturaDocumentoVentaRecord {
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly lineas: readonly ClienteFacturaDocumentoLineaRecord[];
}

export interface ClienteFacturaDocumentoRecord {
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number | null;
  readonly estado: ClienteFacturaEstadoRecord;
  readonly importeCents: number;
  readonly fechaCreacion: string;
  readonly fechaEmision: string | null;
  readonly fechaAnulacion: string | null;
  readonly cliente: ClienteFacturaDocumentoClienteRecord;
  readonly ventas: readonly ClienteFacturaDocumentoVentaRecord[];
}
