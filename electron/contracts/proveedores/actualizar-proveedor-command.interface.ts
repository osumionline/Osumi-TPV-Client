import type ProveedorLogoUpdateCommand from '@desktop-contracts/proveedores/proveedor-logo-update-command.type';

export default interface ActualizarProveedorCommand {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly telefono: string | null;
  readonly observaciones: string | null;
  readonly idsMarcas: readonly number[];

  /**
   * Modificación solicitada sobre el logo.
   *
   * Si se omite se interpreta como `keep`.
   */
  readonly logo?: ProveedorLogoUpdateCommand;
}
