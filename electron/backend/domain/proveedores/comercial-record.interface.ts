export default interface ComercialRecord {
  readonly id: number;

  readonly publicId: string;

  readonly idProveedor: number;

  readonly nombre: string;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly observaciones: string | null;
}
