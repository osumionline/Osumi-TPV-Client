import type StageImageRequest from '@desktop-contracts/files/stage-image-request.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';

export default interface FilesApi {
  /**
   * Convierte y almacena temporalmente una imagen
   * destinada a una ficha de Artículo.
   */
  stageArticleImage(
    request: StageImageRequest,
  ): Promise<StagedImageInterface>;

  /**
   * Convierte y almacena temporalmente una imagen
   * destinada al logo de una Marca.
   */
  stageBrandImage(
    request: StageImageRequest,
  ): Promise<StagedImageInterface>;

  /**
   * Descarta una imagen temporal que ya no forma
   * parte de ningún draft activo.
   */
  discardStagedImage(stagingId: string): Promise<void>;
}