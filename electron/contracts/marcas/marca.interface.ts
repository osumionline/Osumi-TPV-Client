export default interface MarcaInterface {
  readonly id: number;

  readonly publicId: string;

  readonly nombre: string;

  readonly direccion: string | null;

  readonly foto: string | null;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly web: string | null;

  readonly observaciones: string | null;
}
