import type { InventarioFilters } from '@desktop-contracts/almacen/inventario.interface';

export type InventarioReportColumn =
  | 'localizador'
  | 'proveedor'
  | 'marca'
  | 'referencia'
  | 'categoria'
  | 'nombre'
  | 'stock'
  | 'precioAlbaran'
  | 'puc'
  | 'pvp'
  | 'margen'
  | 'codigoBarras';

export interface InventarioReportConsulta extends InventarioFilters {
  readonly columnas: readonly InventarioReportColumn[];
}

export interface InventarioReportRowInterface {
  readonly localizador: number;
  readonly proveedorNombre: string | null;
  readonly marcaNombre: string;
  readonly referencia: string | null;
  readonly categorias: readonly string[];
  readonly nombre: string;
  readonly stock: number;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly margenMicroporcentaje: number;
  readonly codigosBarrasAdicionales: readonly string[];
}

export interface InventarioReportInterface {
  readonly rows: readonly InventarioReportRowInterface[];
  readonly totalRows: number;
  readonly mediaMargenMicroporcentaje: number;
  readonly totalPucMicros: number;
  readonly totalPvpCents: number;
}

export type InventarioCsvExportResult = 'saved' | 'cancelled';
