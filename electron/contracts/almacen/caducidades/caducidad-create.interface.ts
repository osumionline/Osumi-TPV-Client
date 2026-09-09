export interface CaducidadArticuloSearchInterface {
  readonly id: number;
  readonly localizador: number;
  readonly marcaNombre: string;
  readonly nombre: string;
  readonly stock: number;
  readonly pucMicros: number;
  readonly pvpCents: number;
}

export interface CaducidadCreateCommand {
  readonly idArticulo: number;
  readonly unidades: number;
}
