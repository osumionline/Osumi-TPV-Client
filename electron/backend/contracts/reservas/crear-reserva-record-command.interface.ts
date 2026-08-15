export interface CrearReservaLineaRecordCommand {
  readonly articuloPublicId: string | null;

  readonly nombre: string;

  readonly pucMicros: number;
  readonly pvpCents: number;
  readonly ivaBps: number;

  readonly importeCents: number;

  readonly descuentoBps: number;
  readonly importeDescuentoCents: number;

  readonly unidades: number;
}

export default interface CrearReservaRecordCommand {
  readonly clientePublicId: string;

  readonly totalCents: number;

  readonly lineas: readonly CrearReservaLineaRecordCommand[];
}
