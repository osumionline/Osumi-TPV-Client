import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';

export default interface StagedImageInterface {
  readonly stagingId: string;
  readonly purpose: ImageAssetPurpose;
  readonly originalName: string | null;
  readonly url: string;
  readonly mimeType: 'image/webp';
  readonly sizeBytes: number;
  readonly width: number;
  readonly height: number;
}
