export interface VentaDevolucionPagoRecord {
  readonly nombre: string;
  readonly importeCents: number;
}

export interface VentaDevolucionLineaRecord {
  readonly id: number;
  readonly publicId: string;

  readonly idArticulo: number | null;
  readonly articuloPublicId: string | null;
  readonly localizador: number | null;

  readonly nombre: string;

  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly ivaBps: number;

  readonly importeMicros: number;

  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;

  readonly unidades: number;
  readonly unidadesDevueltas: number;
  readonly unidadesDisponibles: number;

  readonly regalo: boolean;
}

export default interface VentaDevolucionRecord {
  readonly id: number;
  readonly publicId: string;

  readonly serie: string;
  readonly numero: number;

  readonly fecha: string;
  readonly cliente: string | null;

  readonly totalCents: number;

  readonly pagos: readonly VentaDevolucionPagoRecord[];
  readonly lineas: readonly VentaDevolucionLineaRecord[];
}
