export interface CrearReservaLineaCommand {
  readonly articuloPublicId: string | null;

  readonly nombre: string;

  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly ivaBps: number;

  readonly importeMicros: number;

  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;

  readonly unidades: number;
}

export default interface CrearReservaCommand {
  readonly clientePublicId: string;

  readonly lineas: readonly CrearReservaLineaCommand[];
}
