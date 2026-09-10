export default interface ImprentaArticuloDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly marca_nombre: string | null;
  readonly nombre: string;
  readonly pvp_cents: number;
}
