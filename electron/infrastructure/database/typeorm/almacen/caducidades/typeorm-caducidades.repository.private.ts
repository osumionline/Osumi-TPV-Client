import type { CaducidadReportMarcaRecord } from '@backend/domain/almacen/caducidades/caducidad-report-record.interface';

export interface DatabaseIdRow {
  readonly id: number;
}

export interface CaducidadAggregateDatabaseRow {
  readonly total_rows: number;
  readonly total_unidades: number;
  readonly total_pvp_cents: number;
  readonly total_puc_micros: number;
}

export interface CaducidadDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_articulo: number;
  readonly localizador_snapshot: number;
  readonly id_marca_snapshot: number;
  readonly marca_nombre_snapshot: string;
  readonly articulo_nombre_snapshot: string;
  readonly unidades: number;
  readonly pvp_cents: number;
  readonly puc_micros: number;
  readonly total_pvp_cents: number;
  readonly fecha_baja: string;
}

export interface CaducidadYearDatabaseRow {
  readonly anio: number;
}

export interface CaducidadBrandDatabaseRow {
  readonly id_marca: number;
  readonly nombre: string;
}

export interface CaducidadSqlFilter {
  readonly clause: string;
  readonly parameters: (number | string)[];
}

export interface CaducidadReportDatabaseRow {
  readonly anio: number;
  readonly mes: number;
  readonly id_marca: number;
  readonly marca_nombre: string;
  readonly unidades: number;
  readonly total_pvp_cents: number;
  readonly total_puc_micros: number;
}

export interface CaducidadReportMonthAccumulator {
  readonly mes: number;
  unidades: number;
  totalPvpCents: number;
  totalPucMicros: number;
  readonly marcas: CaducidadReportMarcaRecord[];
}

export interface CaducidadReportYearAccumulator {
  readonly anio: number;
  unidades: number;
  totalPvpCents: number;
  totalPucMicros: number;
  readonly meses: CaducidadReportMonthAccumulator[];
}

export interface CaducidadArticuloDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly id_marca: number;
  readonly marca_nombre: string;
  readonly nombre: string;
  readonly stock: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
}

export interface CaducidadDeactivateDatabaseRow {
  readonly id: number;
  readonly id_articulo: number;
  readonly unidades: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly deleted_at: string | null;
  readonly stock: number;
}
