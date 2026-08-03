import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

export default interface LegacyImportApi {
  selectPackage(): Promise<LegacyImportPackageSelectionResult>;

  analyzePackage(selectionId: string): Promise<LegacyImportAnalysisReport>;

  confirmReviewDecisions(
    selectionId: string,
    decisions: readonly LegacyImportReviewDecision[],
  ): Promise<LegacyImportPreparationResult>;

  startImport(selectionId: string): Promise<LegacyImportStartResult>;

  onImportProgress(listener: (progress: LegacyImportProgress) => void): () => void;
}
