import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';

export default interface ImageFileStorage {
  /**
   * Guarda una imagen procesada en el almacenamiento definitivo.
   */
  save(
    purpose: ImageAssetPurpose,
    publicId: string,
    image: ProcessedImage,
  ): Promise<StoredImageFile>;

  /**
   * Elimina un archivo previamente almacenado.
   */
  delete(relativePath: string): Promise<void>;
}
