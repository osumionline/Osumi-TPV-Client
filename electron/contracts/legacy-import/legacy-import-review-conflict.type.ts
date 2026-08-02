export interface LegacyImportArticleReference {
  readonly articleId: number;

  readonly name: string;

  readonly locator: number | null;

  readonly directAccess: number | null;
}

export interface LegacyImportDuplicateLocatorConflict {
  readonly id: string;

  readonly code: 'duplicate-active-article-locators';

  readonly value: number;

  readonly articles: readonly LegacyImportArticleReference[];
}

export interface LegacyImportDuplicateDirectAccessConflict {
  readonly id: string;

  readonly code: 'duplicate-active-direct-access-codes';

  readonly value: number;

  readonly articles: readonly LegacyImportArticleReference[];
}

export interface LegacyImportAccessLocatorConflict {
  readonly id: string;

  readonly code: 'direct-access-locator-collisions';

  readonly value: number;

  readonly locatorArticles: readonly LegacyImportArticleReference[];

  readonly directAccessArticles: readonly LegacyImportArticleReference[];
}

export interface LegacyImportBarcodeConflict {
  readonly id: string;

  readonly code: 'active-article-barcode-conflicts';

  readonly barcode: string;

  readonly articles: readonly LegacyImportArticleReference[];
}

export interface LegacyImportSaleDeliveredConflict {
  readonly id: string;

  readonly code: 'anomalous-sale-delivered-amounts';

  readonly saleId: number;

  readonly saleNumber: number;

  readonly total: number;

  readonly delivered: number;
}

export type LegacyImportReviewConflict =
  | LegacyImportDuplicateLocatorConflict
  | LegacyImportDuplicateDirectAccessConflict
  | LegacyImportAccessLocatorConflict
  | LegacyImportBarcodeConflict
  | LegacyImportSaleDeliveredConflict;
