import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import { randomUUID } from 'node:crypto';

export default class InMemoryLegacyImportSelectionStore implements LegacyImportSelectionStore {
  private readonly selections: Map<string, string> = new Map<string, string>();

  save(packagePath: string): string {
    this.selections.clear();

    const selectionId: string = randomUUID();

    this.selections.set(selectionId, packagePath);

    return selectionId;
  }

  resolve(selectionId: string): string | null {
    return this.selections.get(selectionId) ?? null;
  }

  clear(): void {
    this.selections.clear();
  }
}
