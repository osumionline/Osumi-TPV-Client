export interface ArticuloCodigoBarrasSaveRecord {
  readonly id: number | null;
  readonly codigo: string;
}

export interface ArticuloSaveRecord {
  readonly id: number | null;
  readonly nombre: string;
  readonly idMarca: number;
  readonly idProveedor: number | null;
  readonly idsCategorias: readonly number[];
  readonly referencia: string | null;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly pvpDescuentoCents: number | null;
  readonly ivaBps: number;
  readonly reBps: number;
  readonly margenMicroporcentaje: number;
  readonly margenDescuentoMicroporcentaje: number | null;
  readonly stock: number;
  readonly stockMin: number;
  readonly stockMax: number;
  readonly loteOptimo: number;
  readonly ventaOnline: boolean;
  readonly mostrarEnWeb: boolean;
  readonly descripcionCorta: string | null;
  readonly descripcionLarga: string | null;
  readonly observaciones: string | null;
  readonly mostrarObservacionesPedidos: boolean;
  readonly mostrarObservacionesVentas: boolean;
  readonly accesoDirecto: number | null;
  readonly codigosBarrasAdicionales: readonly ArticuloCodigoBarrasSaveRecord[];
}
