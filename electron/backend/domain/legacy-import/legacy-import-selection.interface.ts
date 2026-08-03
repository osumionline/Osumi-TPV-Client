import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

export default interface LegacyImportSelection {
  readonly packagePath: string;

  readonly inspection: LegacyImportPackageInspection;

  readonly analysis: LegacyImportPackageAnalysis | null;

  readonly reviewDecisions: readonly LegacyImportReviewDecision[];

  readonly reviewConfirmedAt: string | null;

  readonly executionResult: LegacyImportStartResult | null;
}
