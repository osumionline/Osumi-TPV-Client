export interface CaducidadFilters {
  readonly anio: number | null;
  readonly mes: number | null;
  readonly idMarca: number | null;
  readonly nombre: string;
}

export interface CaducidadConsulta extends CaducidadFilters {
  readonly pagina: number;
  readonly num: number;
}

export interface CaducidadRowInterface {
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

export interface CaducidadResultado {
  readonly rows: readonly CaducidadRowInterface[];
  readonly totalRows: number;
  readonly totalUnidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}

export interface CaducidadMarcaFilterInterface {
  readonly idMarca: number;
  readonly nombre: string;
}

export interface CaducidadFilterOptionsInterface {
  readonly anios: readonly number[];
  readonly marcas: readonly CaducidadMarcaFilterInterface[];
}
