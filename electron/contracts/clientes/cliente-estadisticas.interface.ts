export interface ClienteUltimaVentaInterface {
  readonly fecha: string;
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly pvpMicros: number;
  readonly importeMicros: number;
}

export interface ClienteTopVentaInterface {
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly importeMicros: number;
}

export interface ClienteEstadisticasInterface {
  readonly ultimasVentas: readonly ClienteUltimaVentaInterface[];
  readonly topVentas: readonly ClienteTopVentaInterface[];
}

export interface ClienteSumaVentasValoresInterface {
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly beneficioMicros: number;
  readonly margenMicroporcentaje: number | null;
}

export interface ClienteSumaVentasMesInterface extends ClienteSumaVentasValoresInterface {
  readonly month: number;
}

export interface ClienteSumaVentasYearInterface extends ClienteSumaVentasValoresInterface {
  readonly year: number;
  readonly months: readonly ClienteSumaVentasMesInterface[];
}

export interface ClienteEstadisticasGeneralesInterface extends ClienteEstadisticasInterface {
  readonly sumaVentas: readonly ClienteSumaVentasYearInterface[];
}
