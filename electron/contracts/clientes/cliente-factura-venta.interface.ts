export interface ClienteFacturaVentasConsulta {
  readonly clientePublicId: string;
  readonly facturaPublicId: string;
}

export interface ClienteFacturaVentasDisponiblesConsulta {
  readonly clientePublicId: string;
  readonly borradorPublicId: string | null;
}

export interface ClienteFacturaVentaPagoInterface {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ClienteFacturaVentaInterface {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly pagos: readonly ClienteFacturaVentaPagoInterface[];
}

export interface ClienteFacturaVentaDisponibleInterface extends ClienteFacturaVentaInterface {
  readonly incluidaEnBorrador: boolean;
}
