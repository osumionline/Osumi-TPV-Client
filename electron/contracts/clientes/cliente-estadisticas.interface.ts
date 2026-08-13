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
