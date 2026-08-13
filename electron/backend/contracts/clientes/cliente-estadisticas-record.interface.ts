export interface ClienteUltimaVentaRecord {
  readonly fecha: string;
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly pvpMicros: number;
  readonly importeMicros: number;
}

export interface ClienteTopVentaRecord {
  readonly localizador: number | null;
  readonly nombre: string;
  readonly unidades: number;
  readonly importeMicros: number;
}
