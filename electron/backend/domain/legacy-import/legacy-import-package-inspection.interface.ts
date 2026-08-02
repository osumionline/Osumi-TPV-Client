import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';

export default interface LegacyImportPackageInspection {
  readonly summary: Omit<LegacyImportPackageSummary, 'selectionId'>;

  readonly tableRows: Readonly<Record<string, number>>;
}
