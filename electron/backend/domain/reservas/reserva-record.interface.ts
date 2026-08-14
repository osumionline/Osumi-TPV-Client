export interface ReservaLineaRecord {
  readonly id: number;
  readonly publicId: string;

  readonly idArticulo: number | null;
  readonly articuloPublicId: string | null;

  readonly localizador: number | null;
  readonly marca: string | null;

  readonly nombre: string;

  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly ivaBps: number;

  readonly importeCents: number;

  readonly descuentoBps: number;
  readonly importeDescuentoCents: number;

  readonly unidades: number;
}

export default interface ReservaRecord {
  readonly id: number;
  readonly publicId: string;

  readonly idCliente: number;
  readonly clientePublicId: string;
  readonly clienteNombre: string;

  readonly totalCents: number;

  readonly fecha: string;

  readonly lineas: readonly ReservaLineaRecord[];
}
