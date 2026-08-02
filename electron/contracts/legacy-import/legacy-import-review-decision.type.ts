export interface LegacyImportLocatorDecision {
  readonly conflictId: string;

  readonly code: 'duplicate-active-article-locators';

  readonly articleId: number;
}

export interface LegacyImportDirectAccessDecision {
  readonly conflictId: string;

  readonly code: 'duplicate-active-direct-access-codes';

  readonly articleId: number | null;
}

export interface LegacyImportBarcodeDecision {
  readonly conflictId: string;

  readonly code: 'active-article-barcode-conflicts';

  readonly articleId: number | null;
}

export interface LegacyImportAccessLocatorDecision {
  readonly conflictId: string;

  readonly code: 'direct-access-locator-collisions';

  readonly action: 'clear-direct-access' | 'reassign-direct-access';
}

export interface LegacyImportSaleDeliveredDecision {
  readonly conflictId: string;

  readonly code: 'anomalous-sale-delivered-amounts';

  readonly action: 'use-sale-total' | 'use-zero';
}

export type LegacyImportReviewDecision =
  | LegacyImportLocatorDecision
  | LegacyImportDirectAccessDecision
  | LegacyImportBarcodeDecision
  | LegacyImportAccessLocatorDecision
  | LegacyImportSaleDeliveredDecision;
