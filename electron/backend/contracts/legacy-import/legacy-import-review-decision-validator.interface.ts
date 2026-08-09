import type { LegacyImportReviewConflict } from '@desktop-contracts/legacy-import/legacy-import-review-conflict.type';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default interface LegacyImportReviewDecisionValidator {
  validate(
    conflicts: readonly LegacyImportReviewConflict[],
    decisions: readonly LegacyImportReviewDecision[],
  ): readonly LegacyImportReviewDecision[];
}
