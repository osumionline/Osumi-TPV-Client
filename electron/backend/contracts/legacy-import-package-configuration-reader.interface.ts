import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportPackageConfiguration from '@backend/domain/legacy-import/legacy-import-package-configuration.interface';

export default interface LegacyImportPackageConfigurationReader {
  read(
    packagePath: string,
    expectedPackageHash: string,
    fileInventory: readonly LegacyImportFileInventoryItem[],
    installedAt: string,
  ): Promise<LegacyImportPackageConfiguration>;
}
