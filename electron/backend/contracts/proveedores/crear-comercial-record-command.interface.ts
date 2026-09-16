export default interface CrearComercialRecordCommand {
  readonly idProveedor: number;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly observaciones: string | null;
}
