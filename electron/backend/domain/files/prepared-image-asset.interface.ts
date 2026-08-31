import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

export default interface PreparedImageAsset {
  readonly stagingId: string;
  readonly archivo: ArchivoCreateRecord;
}
