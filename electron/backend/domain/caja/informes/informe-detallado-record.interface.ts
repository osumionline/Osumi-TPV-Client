export interface InformeDetalladoResumenRecord {
  readonly numeroVentas: number;
  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;
}

export interface InformeDetalladoMarcaRecord {
  readonly marcaPublicId: string;
  readonly nombre: string;

  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;

  readonly totalVentasPvpAnteriorMicros: number;
  readonly totalBeneficioAnteriorMicros: number;
}

export interface InformeDetalladoArticuloRecord {
  readonly idArticulo: number;
  readonly articuloPublicId: string;
  readonly marca: string;
  readonly nombre: string;

  readonly totalUnidadesVendidas: number;
  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;
  readonly numeroVentasArticulo: number;

  readonly totalVentasPvpAnteriorMicros: number | null;
  readonly totalBeneficioAnteriorMicros: number | null;
}

export interface InformeDetalladoRepositoryResult {
  readonly actual: InformeDetalladoResumenRecord;
  readonly anterior: InformeDetalladoResumenRecord;
  readonly marcas: readonly InformeDetalladoMarcaRecord[];
  readonly articulos: readonly InformeDetalladoArticuloRecord[];
}
