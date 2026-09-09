export interface ImprentaArticuloSearchConsulta {
  readonly texto: string;
  readonly idsArticulosExcluidos: readonly number[];
}

export interface ImprentaArticuloSearchInterface {
  readonly id: number;
  readonly localizador: number;
  readonly marcaNombre: string | null;
  readonly nombre: string;
  readonly pvpCents: number;
}
