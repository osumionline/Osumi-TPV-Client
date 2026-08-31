export interface ArticuloCodigoBarrasDraft {
  readonly id: number | null;
  readonly codigo: string;
}

export interface ArticuloFotoDraft {
  readonly id: number | null;
  readonly stagingId: string | null;
  readonly originalName: string | null;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly orden: number;
  readonly principal: boolean;
}

export interface ArticuloDraft {
  readonly id: number | null;
  readonly publicId: string | null;
  readonly localizador: number | null;
  readonly nombre: string;
  readonly idMarca: number | null;
  readonly idProveedor: number | null;
  readonly idsCategorias: readonly number[];
  readonly referencia: string;
  readonly precioAlbaranMicros: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly pvpDescuentoCents: number | null;
  readonly ivaBps: number | null;
  readonly reBps: number | null;
  readonly margenMicroporcentaje: number;
  readonly margenDescuentoMicroporcentaje: number | null;
  readonly stock: number;
  readonly stockMin: number;
  readonly stockMax: number;
  readonly loteOptimo: number;
  readonly ventaOnline: boolean;
  readonly mostrarEnWeb: boolean;
  readonly descripcionCorta: string;
  readonly descripcionLarga: string;
  readonly observaciones: string;
  readonly mostrarObservacionesPedidos: boolean;
  readonly mostrarObservacionesVentas: boolean;
  readonly accesoDirecto: number | null;
  readonly codigosBarrasAdicionales: readonly ArticuloCodigoBarrasDraft[];
  readonly fotos: readonly ArticuloFotoDraft[];
}

export type ArticuloDraftPatch = Partial<Omit<ArticuloDraft, 'id' | 'publicId' | 'localizador'>>;
