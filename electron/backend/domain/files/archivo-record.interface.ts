import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';

export interface ArchivoCreateRecord {
  readonly publicId: string;
  readonly purpose: ImageAssetPurpose;
  readonly originalName: string | null;
  readonly internalName: string;
  readonly relativePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}

export interface ArchivoRecord extends ArchivoCreateRecord {
  readonly id: number;
}
