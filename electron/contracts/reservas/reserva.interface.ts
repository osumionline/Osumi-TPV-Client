export interface ReservaLineaInterface {
  readonly id: number;
  readonly publicId: string;

  readonly idArticulo: number | null;
  readonly articuloPublicId: string | null;

  readonly localizador: number | null;
  readonly marca: string | null;

  readonly nombre: string;

  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly ivaBps: number;

  readonly importeMicros: number;

  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;

  readonly unidades: number;
}

export default interface ReservaInterface {
  readonly id: number;
  readonly publicId: string;

  readonly idCliente: number;
  readonly clientePublicId: string;
  readonly clienteNombre: string;

  readonly totalMicros: number;

  readonly fecha: string;

  readonly lineas: readonly ReservaLineaInterface[];
}
