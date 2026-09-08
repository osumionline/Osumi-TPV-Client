export interface CaducidadReportMarcaRecord {
  readonly idMarca: number;
  readonly nombre: string;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}

export interface CaducidadReportMesRecord {
  readonly mes: number;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
  readonly marcas: readonly CaducidadReportMarcaRecord[];
}

export interface CaducidadReportAnioRecord {
  readonly anio: number;
  readonly unidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
  readonly meses: readonly CaducidadReportMesRecord[];
}

export interface CaducidadReportRecord {
  readonly anios: readonly CaducidadReportAnioRecord[];
  readonly totalUnidades: number;
  readonly totalPvpCents: number;
  readonly totalPucMicros: number;
}
