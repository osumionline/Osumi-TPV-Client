export default interface ImprentaPrintArticuloRecord {
  readonly idArticulo: number;
  readonly localizador: number;
  readonly marcaNombre: string | null;
  readonly nombre: string;
  readonly pvpCents: number;
}
