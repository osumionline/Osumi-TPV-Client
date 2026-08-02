import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';

export default interface LegacyImportSelectionStore {
  save(selection: LegacyImportSelection): string;

  resolve(selectionId: string): LegacyImportSelection | null;

  clear(): void;
}
