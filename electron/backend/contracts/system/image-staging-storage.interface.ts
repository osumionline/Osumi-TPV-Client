import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';

export default interface ImageStagingStorage {
  /**
   * Guarda físicamente una imagen procesada en staging.
   */
  save(stagingId: string, image: ProcessedImage): Promise<StoredImageFile>;

  /**
   * Elimina una imagen del staging.
   */
  delete(relativePath: string): Promise<void>;
}
