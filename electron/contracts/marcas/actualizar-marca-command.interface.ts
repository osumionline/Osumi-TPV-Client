import type MarcaLogoUpdateCommand from '@desktop-contracts/marcas/marca-logo-update-command.type';

export default interface ActualizarMarcaCommand {
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;

  /**
   * Modificación solicitada sobre el logo.
   *
   * Si se omite se interpreta como `keep` para
   * mantener compatible el contrato existente.
   */
  readonly logo?: MarcaLogoUpdateCommand;
}
