import { Injectable } from '@angular/core';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

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
}
