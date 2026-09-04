export interface ClienteFacturaVentaPagoRecord {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ClienteFacturaVentaDisponibleRecord {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly incluidaEnBorrador: boolean;
  readonly pagos: readonly ClienteFacturaVentaPagoRecord[];
}
