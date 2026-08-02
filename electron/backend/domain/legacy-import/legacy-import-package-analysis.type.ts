import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';

type LegacyImportPackageAnalysis = Omit<LegacyImportAnalysisReport, 'selectionId'>;

export default LegacyImportPackageAnalysis;
