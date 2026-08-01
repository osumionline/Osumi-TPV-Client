import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';

type LegacyImportPackageSelectionResult =
  | {
      readonly status: 'cancelled';
    }
  | {
      readonly status: 'selected';

      readonly package: LegacyImportPackageSummary;
    };

export default LegacyImportPackageSelectionResult;
