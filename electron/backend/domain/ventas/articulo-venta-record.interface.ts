export interface ArticuloVentaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly marca: string;
  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly pvpDescuentoCents: number | null;
  readonly ivaBps: number;
  readonly stock: number;
  readonly fechaCaducidad: string | null;
  readonly observaciones: string | null;
  readonly mostrarObservacionesVentas: boolean;
}

export interface AccesoDirectoVentaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly accesoDirecto: number;
  readonly nombre: string;
}
