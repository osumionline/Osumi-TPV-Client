import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
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

  setAnalysis(
    selectionId: string,

    analysis: LegacyImportPackageAnalysis,
  ): void {
    const selection: LegacyImportSelection = this.getRequiredSelection(selectionId);

    this.selections.set(selectionId, {
      ...selection,
      analysis,
      reviewDecisions: [],
      reviewConfirmedAt: null,
    });
  }

  setReviewDecisions(
    selectionId: string,
    decisions: readonly LegacyImportReviewDecision[],
    confirmedAt: string,
  ): void {
    const selection: LegacyImportSelection = this.getRequiredSelection(selectionId);

    if (selection.analysis === null) {
      throw new Error('No se pueden guardar decisiones antes de analizar el paquete.');
    }

    this.selections.set(selectionId, {
      ...selection,
      reviewDecisions: [...decisions],
      reviewConfirmedAt: confirmedAt,
    });
  }

  clear(): void {
    this.selections.clear();
  }

  private getRequiredSelection(selectionId: string): LegacyImportSelection {
    const selection: LegacyImportSelection | undefined = this.selections.get(selectionId);

    if (selection === undefined) {
      throw new Error(['La selección del paquete', 'ya no está disponible.'].join(' '));
    }

    return selection;
  }
}
