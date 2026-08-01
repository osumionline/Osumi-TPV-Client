import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';

type LegacyImportPackageInspection = Omit<LegacyImportPackageSummary, 'selectionId'>;

export default LegacyImportPackageInspection;
