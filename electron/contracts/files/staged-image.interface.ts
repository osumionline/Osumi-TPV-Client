import type ImageAssetPurpose from '@desktop-contracts/files/image-asset-purpose.type';

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
