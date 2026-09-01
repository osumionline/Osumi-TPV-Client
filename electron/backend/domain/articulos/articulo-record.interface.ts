export interface ArticuloCodigoBarrasRecord {
  readonly id: number;
  readonly publicId: string;
  readonly codigo: string;
  readonly porDefecto: boolean;
}

export interface ArticuloFotoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly originalName: string | null;
  readonly relativePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly orden: number;
  readonly principal: boolean;
}

export interface ArticuloAccesoDirectoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly accesoDirecto: number;
  readonly nombre: string;
}

export interface ArticuloRecord {
  readonly id: number;
  readonly publicId: string;
  readonly localizador: number;
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
  readonly codigosBarras: readonly ArticuloCodigoBarrasRecord[];
  readonly fotos: readonly ArticuloFotoRecord[];
}
