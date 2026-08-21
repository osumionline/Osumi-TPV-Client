export interface VentaTicketPagoRecord {
  readonly nombre: string;

  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
}

export interface VentaTicketLineaRecord {
  readonly nombre: string;

  readonly pvpMicros: number;
  readonly ivaBps: number;

  readonly importeMicros: number;

  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;

  readonly unidades: number;
  readonly regalo: boolean;
}

export interface VentaTicketRecord {
  readonly id: number;
  readonly publicId: string;

  readonly serie: string;
  readonly numero: number;

  readonly fecha: string;

  readonly empleadoNombre: string;
  readonly clienteNombre: string | null;

  readonly totalCents: number;

  readonly pagos: readonly VentaTicketPagoRecord[];
  readonly lineas: readonly VentaTicketLineaRecord[];
}
