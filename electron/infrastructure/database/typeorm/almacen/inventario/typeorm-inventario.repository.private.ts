import type HISTORICO_ARTICULO_TIPO from '@backend/domain/articulos/historico-articulo.constants';

export type InventarioHistoricoTipo =
  typeof HISTORICO_ARTICULO_TIPO.INVENTARIO | typeof HISTORICO_ARTICULO_TIPO.INVENTARIO_ALL;

export interface InventarioAggregateDatabaseRow {
  readonly total_rows: number;
  readonly media_margen_microporcentaje: number;
  readonly total_puc_micros: number;
  readonly total_pvp_cents: number;
}

export interface InventarioDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly id_proveedor: number | null;
  readonly proveedor_nombre: string | null;
  readonly id_marca: number;
  readonly marca_nombre: string;
  readonly referencia: string | null;
  readonly nombre: string;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
  readonly iva_bps: number;
  readonly re_bps: number;
  readonly tiene_codigo_adicional: number;
  readonly sin_ventas_ultimos_12_meses: number;
}

export interface InventarioCategoriaDatabaseRow {
  readonly id_articulo: number;
  readonly id_categoria: number;
}

export interface InventarioSqlFilter {
  readonly clause: string;
  readonly parameters: (number | string)[];
}

export interface InventarioUpdateDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly acceso_directo: number | null;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
}

export interface DatabaseIdRow {
  readonly id: number;
}

export interface InventarioReportDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly proveedor_nombre: string | null;
  readonly marca_nombre: string;
  readonly referencia: string | null;
  readonly nombre: string;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
}

export interface InventarioReportCategoriaDatabaseRow {
  readonly id_articulo: number;
  readonly nombre: string;
}

export interface InventarioReportBarcodeDatabaseRow {
  readonly id_articulo: number;
  readonly codigo: string;
}
