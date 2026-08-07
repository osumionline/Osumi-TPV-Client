import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';

export default interface ProveedorRecord {
  readonly id: number;

  readonly publicId: string;

  readonly nombre: string;

  readonly fotoRelativePath: string | null;

  readonly direccion: string | null;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly web: string | null;

  readonly observaciones: string | null;

  readonly marcas: readonly number[];

  readonly comerciales: readonly ComercialRecord[];
}
