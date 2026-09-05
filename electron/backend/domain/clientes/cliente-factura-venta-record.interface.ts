export interface ClienteFacturaVentaPagoRecord {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ClienteFacturaVentaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly pagos: readonly ClienteFacturaVentaPagoRecord[];
}

export interface ClienteFacturaVentaDisponibleRecord extends ClienteFacturaVentaRecord {
  readonly incluidaEnBorrador: boolean;
}
