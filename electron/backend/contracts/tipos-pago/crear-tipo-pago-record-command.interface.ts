import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

export default interface CrearTipoPagoRecordCommand {
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly fisico: boolean;
  readonly nuevoLogo: ArchivoCreateRecord;
}
