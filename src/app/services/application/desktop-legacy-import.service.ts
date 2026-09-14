import { Service } from '@angular/core';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

@Service()
export default class DesktopLegacyImportService {
  selectPackage(): Promise<LegacyImportPackageSelectionResult> {
    return window.osumiDesktop.legacyImport.selectPackage();
  }

  analyzePackage(selectionId: string): Promise<LegacyImportAnalysisReport> {
    return window.osumiDesktop.legacyImport.analyzePackage(selectionId);
  }

  confirmReviewDecisions(
    selectionId: string,
    decisions: readonly LegacyImportReviewDecision[],
  ): Promise<LegacyImportPreparationResult> {
    return window.osumiDesktop.legacyImport.confirmReviewDecisions(selectionId, decisions);
  }

  startImport(selectionId: string): Promise<LegacyImportStartResult> {
    return window.osumiDesktop.legacyImport.startImport(selectionId);
  }

  onImportProgress(listener: (progress: LegacyImportProgress) => void): () => void {
    return window.osumiDesktop.legacyImport.onImportProgress(listener);
  }
}
