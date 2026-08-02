import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';

export default interface LegacyImportDumpAnalyzer {
  analyze(
    packagePath: string,

    expectedTableRows: Readonly<Record<string, number>>,
  ): Promise<LegacyImportPackageAnalysis>;
}
