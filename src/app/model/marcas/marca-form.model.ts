export default interface MarcaFormModel {
  readonly nombre: string;
  readonly telefono: string;
  readonly email: string;
  readonly direccion: string;
  readonly web: string;
  readonly observaciones: string;
  readonly foto: string | null;
}
