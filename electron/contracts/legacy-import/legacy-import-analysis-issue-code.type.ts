type LegacyImportAnalysisIssueCode =
  | 'orphaned-employee-permissions'
  | 'duplicate-active-article-names'
  | 'duplicate-active-article-slugs'
  | 'duplicate-active-article-locators'
  | 'duplicate-active-direct-access-codes'
  | 'direct-access-locator-collisions'
  | 'empty-barcodes'
  | 'duplicate-barcodes'
  | 'active-article-barcode-conflicts'
  | 'missing-order-numbers'
  | 'duplicate-order-numbers'
  | 'anomalous-sale-delivered-amounts';

export default LegacyImportAnalysisIssueCode;
