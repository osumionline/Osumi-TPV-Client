export default interface CrearProveedorCommand {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly telefono: string | null;
  readonly observaciones: string | null;
  readonly idsMarcas: readonly number[];
}
