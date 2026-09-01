import type StageImageRequest from '@desktop-contracts/files/stage-image-request.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';

export default interface FilesApi {
  stageArticleImage(request: StageImageRequest): Promise<StagedImageInterface>;

  discardStagedImage(stagingId: string): Promise<void>;
}
