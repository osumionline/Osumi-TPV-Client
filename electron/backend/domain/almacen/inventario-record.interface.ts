export interface InventarioRowRecord {
  readonly id: number;
  readonly publicId: string;
  readonly localizador: number;
  readonly idProveedor: number | null;
  readonly proveedorNombre: string | null;
  readonly idMarca: number;
  readonly marcaNombre: string;
  readonly referencia: string | null;
  readonly idsCategorias: readonly number[];
  readonly nombre: string;
  readonly stock: number;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly margenMicroporcentaje: number;
  readonly ivaBps: number;
  readonly reBps: number;
  readonly tieneCodigoAdicional: boolean;
  readonly sinVentasUltimos12Meses: boolean;
}

export interface InventarioResultadoRecord {
  readonly rows: readonly InventarioRowRecord[];
  readonly totalRows: number;
  readonly mediaMargenMicroporcentaje: number;
  readonly totalPucMicros: number;
  readonly totalPvpCents: number;
}
