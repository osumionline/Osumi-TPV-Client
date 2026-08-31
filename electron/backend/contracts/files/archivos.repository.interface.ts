import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';

export default interface ArchivosRepository {
  /**
   * Registra un archivo persistente y devuelve
   * el registro creado.
   */
  create(command: ArchivoCreateRecord): Promise<ArchivoRecord>;
}
