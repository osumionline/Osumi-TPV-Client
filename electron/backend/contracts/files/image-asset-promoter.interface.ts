import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';

export default interface ImageAssetPromoter {
  /**
   * Prepara una imagen staged en el almacenamiento definitivo.
   */
  prepare(stagingId: string, expectedPurpose: ImageAssetPurpose): Promise<PreparedImageAsset>;

  /**
   * Elimina una copia definitiva preparada que no se ha persistido.
   */
  rollback(prepared: PreparedImageAsset): Promise<void>;
}
