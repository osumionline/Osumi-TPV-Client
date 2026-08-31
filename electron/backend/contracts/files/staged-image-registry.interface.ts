import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';

export default interface StagedImageRegistry {
  /**
   * Obtiene una imagen temporal registrada durante
   * la ejecución actual de la aplicación.
   */
  getRecord(stagingId: string): StagedImageRecord | null;
}
