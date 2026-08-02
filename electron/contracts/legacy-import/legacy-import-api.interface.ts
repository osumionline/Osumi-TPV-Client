import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

export default interface LegacyImportApi {
  selectPackage(): Promise<LegacyImportPackageSelectionResult>;

  analyzePackage(selectionId: string): Promise<LegacyImportAnalysisReport>;
}
