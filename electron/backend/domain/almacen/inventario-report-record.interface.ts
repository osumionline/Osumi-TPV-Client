export interface InventarioReportRowRecord {
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

export interface InventarioReportRecord {
  readonly rows: readonly InventarioReportRowRecord[];
  readonly totalRows: number;
  readonly mediaMargenMicroporcentaje: number;
  readonly totalPucMicros: number;
  readonly totalPvpCents: number;
}
