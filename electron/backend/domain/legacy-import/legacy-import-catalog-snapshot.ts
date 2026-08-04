export interface LegacyCatalogArticle {
  readonly id: number;

  readonly locator: number;

  readonly name: string;

  readonly slug: string;

  readonly categoryId: number | null;

  readonly brandId: number;

  readonly providerId: number | null;

  readonly reference: string | null;

  readonly deliveryPrice: number;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly discountedSalePrice: number | null;

  readonly taxRate: number;

  readonly equivalenceSurcharge: number;

  readonly margin: number;

  readonly discountedMargin: number | null;

  readonly stock: number;

  readonly minimumStock: number;

  readonly maximumStock: number;

  readonly optimalLot: number;

  readonly onlineSale: boolean;

  readonly expirationDate: string | null;

  readonly visibleOnline: boolean;

  readonly shortDescription: string | null;

  readonly description: string | null;

  readonly notes: string | null;

  readonly showNotesInOrders: boolean;

  readonly showNotesInSales: boolean;

  readonly directAccess: number | null;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

export interface LegacyCatalogBarcode {
  readonly id: number;

  readonly articleId: number;

  readonly code: string;

  readonly default: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogTag {
  readonly id: number;

  readonly text: string;

  readonly slug: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogArticleTag {
  readonly articleId: number;

  readonly tagId: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogArticleWebTag {
  readonly articleId: number;

  readonly tagId: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogPhoto {
  readonly id: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogArticlePhoto {
  readonly photoId: number;

  readonly articleId: number;

  readonly order: number;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyCatalogExpiration {
  readonly id: number;

  readonly articleId: number;

  readonly units: number;

  readonly purchasePrice: number;

  readonly salePrice: number;

  readonly createdAt: string | null;

  readonly updatedAt: string | null;
}

export default interface LegacyImportCatalogSnapshot {
  readonly articles: readonly LegacyCatalogArticle[];

  readonly barcodes: readonly LegacyCatalogBarcode[];

  readonly tags: readonly LegacyCatalogTag[];

  readonly webTags: readonly LegacyCatalogTag[];

  readonly articleTags: readonly LegacyCatalogArticleTag[];

  readonly articleWebTags: readonly LegacyCatalogArticleWebTag[];

  readonly photos: readonly LegacyCatalogPhoto[];

  readonly articlePhotos: readonly LegacyCatalogArticlePhoto[];

  readonly expirations: readonly LegacyCatalogExpiration[];

  readonly sourceRows: number;
}
