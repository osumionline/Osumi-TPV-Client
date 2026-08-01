import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

export default interface LegacyImportApi {
  selectPackage(): Promise<LegacyImportPackageSelectionResult>;
}
