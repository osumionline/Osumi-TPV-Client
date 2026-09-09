export interface CaducidadRowRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idArticulo: number;
  readonly localizador: number;
  readonly idMarca: number;
  readonly marcaNombre: string;
  readonly nombre: string;
  readonly unidades: number;
  readonly pvpCents: number;
  readonly pucMicros: number;
  readonly totalPvpCents: number;
  readonly fechaBaja: string;
}

export interface CaducidadResultadoRecord {
  readonly rows: readonly CaducidadRowRecord[];
  readonly totalRows: number;
  readonly totalUnidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}

export interface CaducidadMarcaFilterRecord {
  readonly idMarca: number;
  readonly nombre: string;
}

export interface CaducidadFilterOptionsRecord {
  readonly anios: readonly number[];
  readonly marcas: readonly CaducidadMarcaFilterRecord[];
}
