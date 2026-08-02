import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import { randomUUID } from 'node:crypto';

export default class InMemoryLegacyImportSelectionStore implements LegacyImportSelectionStore {
  private readonly selections: Map<string, LegacyImportSelection> = new Map<
    string,
    LegacyImportSelection
  >();

  save(selection: LegacyImportSelection): string {
    this.selections.clear();

    const selectionId: string = randomUUID();

    this.selections.set(selectionId, selection);

    return selectionId;
  }

  resolve(selectionId: string): LegacyImportSelection | null {
    return this.selections.get(selectionId) ?? null;
  }

  clear(): void {
    this.selections.clear();
  }
}
