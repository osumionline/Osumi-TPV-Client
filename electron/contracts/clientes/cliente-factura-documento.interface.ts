import type { ClienteFacturaEstado } from '@desktop-contracts/clientes/cliente-factura.interface';

export interface ClienteFacturaDocumentoConsulta {
  readonly clientePublicId: string;
  readonly facturaPublicId: string;
}

export interface ClienteFacturaDocumentoEmisorInterface {
  readonly nombre: string;
  readonly nombreComercial: string;
  readonly cif: string;
  readonly telefono: string;
  readonly direccion: string;
  readonly poblacion: string;
  readonly email: string;
  readonly web: string;
}

export interface ClienteFacturaDocumentoClienteInterface {
  readonly nombreApellidos: string;
  readonly dniCif: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provinciaId: number | null;
}

export interface ClienteFacturaDocumentoLineaInterface {
  readonly localizador: number;
  readonly marca: string;
  readonly nombre: string;
  readonly pvpCents: number;
  readonly baseUnitCents: number;
  readonly unidades: number;
  readonly subtotalCents: number;
  readonly ivaBps: number;
  readonly ivaCents: number;
  readonly descuentoCents: number;
  readonly totalCents: number;
  readonly regalo: boolean;
}

export interface ClienteFacturaDocumentoVentaInterface {
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly pvpCents: number;
  readonly baseCents: number;
  readonly subtotalCents: number;
  readonly ivaCents: number;
  readonly descuentoCents: number;
  readonly totalCents: number;
  readonly lineas: readonly ClienteFacturaDocumentoLineaInterface[];
}

export interface ClienteFacturaDocumentoImpuestoInterface {
  readonly ivaBps: number;
  readonly baseCents: number;
  readonly cuotaCents: number;
  readonly totalCents: number;
}

export interface ClienteFacturaDocumentoInterface {
  readonly facturaPublicId: string;
  readonly serie: string;
  readonly numero: number | null;
  readonly year: number;
  readonly numeroFactura: string;
  readonly estado: ClienteFacturaEstado;
  readonly previsualizacion: boolean;
  readonly generatedAt: string;
  readonly fechaDocumento: string;
  readonly fechaCreacion: string;
  readonly fechaEmision: string | null;
  readonly fechaAnulacion: string | null;
  readonly emisor: ClienteFacturaDocumentoEmisorInterface;
  readonly cliente: ClienteFacturaDocumentoClienteInterface;
  readonly ventas: readonly ClienteFacturaDocumentoVentaInterface[];
  readonly impuestos: readonly ClienteFacturaDocumentoImpuestoInterface[];
  readonly subtotalCents: number;
  readonly descuentoCents: number;
  readonly totalCents: number;
}
