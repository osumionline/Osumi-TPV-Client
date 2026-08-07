export interface ComercialInterface {
  readonly id: number;

  readonly publicId: string;

  readonly idProveedor: number;

  readonly nombre: string;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly observaciones: string | null;
}

export interface ProveedorInterface {
  readonly id: number;

  readonly publicId: string;

  readonly nombre: string;

  readonly foto: string | null;

  readonly direccion: string | null;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly web: string | null;

  readonly observaciones: string | null;

  readonly marcas: readonly number[];

  readonly comerciales: readonly ComercialInterface[];
}
