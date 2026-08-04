import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';

export default interface LegacyImportPackageInspection {
  readonly summary: Omit<LegacyImportPackageSummary, 'selectionId'>;

  readonly tableRows: Readonly<Record<string, number>>;

  readonly fileInventory: readonly LegacyImportFileInventoryItem[];

  readonly packageSha256: string;
}
