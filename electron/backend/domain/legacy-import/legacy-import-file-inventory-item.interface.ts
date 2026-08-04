import type LegacyImportFileInventoryStatus from '@backend/domain/legacy-import/legacy-import-file-inventory-status.type';

export default interface LegacyImportFileInventoryItem {
  readonly logicalCategory: string;
  readonly sourceTable: string | null;
  readonly legacyId: number | null;
  readonly relatedId: number | null;
  readonly packagePath: string | null;
  readonly originalName: string | null;
  readonly storedName: string | null;
  readonly size: number | null;
  readonly mimeType: string | null;
  readonly sha256: string | null;
  readonly status: LegacyImportFileInventoryStatus;
}
