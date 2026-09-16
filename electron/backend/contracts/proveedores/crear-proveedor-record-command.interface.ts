import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

export default interface CrearProveedorRecordCommand {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly telefono: string | null;
  readonly observaciones: string | null;
  readonly idsMarcas: readonly number[];
  readonly nuevoLogo: ArchivoCreateRecord | null;
}
