import type MarcaLogoUpdateRecord from '@backend/contracts/marcas/marca-logo-update-record.type';

export default interface ActualizarMarcaRecordCommand {
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly logo: MarcaLogoUpdateRecord;
}
