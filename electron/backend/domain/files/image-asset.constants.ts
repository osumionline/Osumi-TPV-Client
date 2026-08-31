import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';

const IMAGE_ASSET_DIRECTORY_BY_PURPOSE: Readonly<Record<ImageAssetPurpose, string>> = {
  article_image: 'articles',
  brand_image: 'brands',
  provider_image: 'providers',
  payment_type_icon: 'payment-types',
};

export default IMAGE_ASSET_DIRECTORY_BY_PURPOSE;
