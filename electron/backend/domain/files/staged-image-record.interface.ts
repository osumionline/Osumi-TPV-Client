import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';

export default interface StagedImageRecord {
  readonly stagingId: string;
  readonly purpose: ImageAssetPurpose;
  readonly originalName: string | null;
  readonly relativePath: string;
  readonly mimeType: 'image/webp';
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}
