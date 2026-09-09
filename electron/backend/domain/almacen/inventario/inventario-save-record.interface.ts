export default interface InventarioSaveRecord {
  readonly idArticulo: number;
  readonly idsCategorias: readonly number[];
  readonly stock: number;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly margenMicroporcentaje: number;
  readonly codigoAdicional: string | null;
}
