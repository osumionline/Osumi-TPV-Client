export interface InformeSimpleVentaRecord {
  readonly id: number;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
}

export interface InformeSimplePagoRecord {
  readonly idVenta: number;
  readonly tipoPagoPublicId: string;
  readonly importeCents: number;
}

export interface InformeSimpleTipoPagoRecord {
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly orden: number;
}

export interface InformeSimpleRepositoryResult {
  readonly ventas: readonly InformeSimpleVentaRecord[];
  readonly pagos: readonly InformeSimplePagoRecord[];
  readonly tiposPago: readonly InformeSimpleTipoPagoRecord[];
}
