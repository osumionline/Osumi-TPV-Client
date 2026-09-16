import type ProveedorLogoUpdateRecord from '@backend/contracts/proveedores/proveedor-logo-update-record.type';

export default interface ActualizarProveedorRecordCommand {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly telefono: string | null;
  readonly observaciones: string | null;
  readonly idsMarcas: readonly number[];
  readonly logo: ProveedorLogoUpdateRecord;
}
