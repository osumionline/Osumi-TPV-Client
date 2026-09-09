import type { CaducidadFilters } from '@desktop-contracts/almacen/caducidades/caducidad.interface';

export type CaducidadReportConsulta = CaducidadFilters;

export interface CaducidadReportMarcaInterface {
  readonly idMarca: number;
  readonly nombre: string;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}

export interface CaducidadReportMesInterface {
  readonly mes: number;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
  readonly marcas: readonly CaducidadReportMarcaInterface[];
}

export interface CaducidadReportAnioInterface {
  readonly anio: number;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
  readonly meses: readonly CaducidadReportMesInterface[];
}

export interface CaducidadReportInterface {
  readonly anios: readonly CaducidadReportAnioInterface[];
  readonly totalUnidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}
