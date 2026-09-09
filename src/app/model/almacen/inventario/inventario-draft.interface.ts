export type InventarioPriceField = 'precioAlbaran' | 'puc' | 'pvp';

export type InventarioDirtyField =
  'categoria' | 'stock' | 'precioAlbaran' | 'puc' | 'pvp' | 'margen' | 'codigoBarras';

export interface InventarioDraftValues {
  readonly idsCategorias: readonly number[];
  readonly stock: number;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly margenMicroporcentaje: number;
  readonly codigoAdicional: string;
}

export type InventarioDraftPatch = Partial<InventarioDraftValues>;

export interface InventarioDraftEntry {
  readonly snapshot: InventarioDraftValues;
  readonly draft: InventarioDraftValues;
  readonly filterKeys: readonly string[];
}
