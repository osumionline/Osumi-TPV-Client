import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacyImportNormalizedCatalog from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type { LegacyImportCatalogNormalizationContext } from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default interface LegacyImportCatalogNormalizer {
  normalize(
    snapshot: LegacyImportCatalogSnapshot,
    decisions: readonly LegacyImportReviewDecision[],
    context: LegacyImportCatalogNormalizationContext,
  ): LegacyImportNormalizedCatalog;
}
