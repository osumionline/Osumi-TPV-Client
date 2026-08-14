export default interface VentaLineaReservaOrigen {
  readonly reservaId: number;
  readonly reservaPublicId: string;

  readonly lineaId: number;
  readonly lineaPublicId: string;

  readonly idArticulo: number | null;
  readonly articuloPublicId: string | null;

  readonly unidadesReservadas: number;

  readonly importeReservadoMicros: number;

  readonly descuentoBps: number;

  readonly importeDescuentoReservadoMicros: number;
}
