export interface ClienteFacturaVentasDisponiblesConsulta {
  readonly clientePublicId: string;
  readonly borradorPublicId: string | null;
}

export interface ClienteFacturaVentaPagoInterface {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ClienteFacturaVentaDisponibleInterface {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly incluidaEnBorrador: boolean;
  readonly pagos: readonly ClienteFacturaVentaPagoInterface[];
}
