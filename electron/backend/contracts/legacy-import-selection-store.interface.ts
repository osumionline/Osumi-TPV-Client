import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default interface LegacyImportSelectionStore {
  save(selection: LegacyImportSelection): string;

  resolve(selectionId: string): LegacyImportSelection | null;

  setAnalysis(selectionId: string, analysis: LegacyImportPackageAnalysis): void;

  setReviewDecisions(
    selectionId: string,
    decisions: readonly LegacyImportReviewDecision[],
    confirmedAt: string,
  ): void;

  clear(): void;
}
