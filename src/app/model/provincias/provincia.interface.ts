export interface ProvinciaInterface {
  readonly id: number;
  readonly name: string;
}

export interface ComunidadAutonomaInterface {
  readonly name: string;
  readonly provinces: readonly ProvinciaInterface[];
}
