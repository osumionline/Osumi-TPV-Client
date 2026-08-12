export default interface CrearClienteRecordCommand {
  readonly nombreApellidos: string;
  readonly dniCif: string | null;
  readonly telefono: string | null;
  readonly email: string | null;

  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provincia: number | null;

  readonly factIgual: boolean;
  readonly factNombreApellidos: string | null;
  readonly factDniCif: string | null;
  readonly factTelefono: string | null;
  readonly factEmail: string | null;
  readonly factDireccion: string | null;
  readonly factCodigoPostal: string | null;
  readonly factPoblacion: string | null;
  readonly factProvincia: number | null;

  readonly observaciones: string | null;

  readonly descuentoBps: number;
}
