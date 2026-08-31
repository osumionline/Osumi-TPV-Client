export type ImageAssetPurpose =
  'article_image' | 'brand_image' | 'provider_image' | 'payment_type_icon';

export interface StoredImageFile {
  readonly internalName: string;
  readonly relativePath: string;
}
