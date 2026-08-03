import { Injectable } from '@angular/core';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

@Injectable({
  providedIn: 'root',
})
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
}
