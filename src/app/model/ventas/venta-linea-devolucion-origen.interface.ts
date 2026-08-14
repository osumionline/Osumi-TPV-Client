export default interface VentaLineaDevolucionOrigen {
  readonly id: number;
  readonly publicId: string;

  readonly unidadesOriginales: number;
  readonly unidadesDevueltasPrevias: number;
  readonly unidadesDisponibles: number;

  readonly importeOriginalMicros: number;

  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;

  readonly regalo: boolean;
}
