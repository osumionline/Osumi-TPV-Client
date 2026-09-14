import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

export default interface CrearMarcaRecordCommand {
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly crearProveedor: boolean;
  readonly nuevoLogo: ArchivoCreateRecord | null;
}
