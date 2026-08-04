import type {
  LegacyCatalogArticleTag,
  LegacyCatalogArticleWebTag,
} from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';

export interface LegacyImportNormalizedArticle {
  readonly id: number;

  readonly publicId: string;

  readonly locator: number;

  readonly name: string;

  readonly slug: string;

  readonly categoryId: number | null;

  readonly brandId: number;

  readonly providerId: number | null;

  readonly reference: string | null;

  readonly deliveryPriceMicros: number;

  readonly purchasePriceMicros: number;

  readonly salePriceCents: number;

  readonly discountedSalePriceCents: number | null;

  readonly taxRateBps: number;

  readonly equivalenceSurchargeBps: number;

  readonly marginMicropercentage: number;

  readonly discountedMarginMicropercentage: number | null;

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

export interface LegacyImportNormalizedBarcode {
  readonly id: number;

  readonly publicId: string;

  readonly articleId: number;

  readonly code: string;

  readonly default: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

export interface LegacyImportNormalizedTag {
  readonly id: number;

  readonly publicId: string;

  readonly text: string;

  readonly slug: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyImportNormalizedExpiration {
  readonly id: number;

  readonly publicId: string;

  readonly articleId: number;

  readonly units: number;

  readonly purchasePriceMicros: number;

  readonly salePriceCents: number;

  readonly removalDate: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

export interface LegacyImportCatalogNormalizationContext {
  readonly sourceHash: string;

  readonly startedAt: string;

  readonly categoryIds: ReadonlySet<number>;

  readonly brandIds: ReadonlySet<number>;

  readonly providerIds: ReadonlySet<number>;

  readonly fallbackBrandId: number | null;
}

export default interface LegacyImportNormalizedCatalog {
  readonly articles: readonly LegacyImportNormalizedArticle[];

  readonly barcodes: readonly LegacyImportNormalizedBarcode[];

  readonly tags: readonly LegacyImportNormalizedTag[];

  readonly webTags: readonly LegacyImportNormalizedTag[];

  readonly articleTags: readonly LegacyCatalogArticleTag[];

  readonly articleWebTags: readonly LegacyCatalogArticleWebTag[];

  readonly expirations: readonly LegacyImportNormalizedExpiration[];

  readonly skippedRows: number;

  readonly warningCount: number;
}
