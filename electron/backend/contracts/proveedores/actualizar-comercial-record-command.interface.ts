export default interface ActualizarComercialRecordCommand {
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly observaciones: string | null;
}
