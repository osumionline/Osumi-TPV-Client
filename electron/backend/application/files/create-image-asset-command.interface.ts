import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';

export default interface CreateImageAssetCommand {
  readonly purpose: ImageAssetPurpose;
  readonly originalName: string | null;
  readonly buffer: Buffer;
}
