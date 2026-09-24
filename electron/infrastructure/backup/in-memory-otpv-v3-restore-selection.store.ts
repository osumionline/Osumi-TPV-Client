import type OtpvV3RestoreSelectionStore from '@backend/contracts/backup/otpv-v3-restore-selection-store.interface';
import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';
import { randomUUID } from 'node:crypto';

export default class InMemoryOtpvV3RestoreSelectionStore implements OtpvV3RestoreSelectionStore {
  private readonly selections: Map<string, OtpvV3RestoreSelection> = new Map<
    string,
    OtpvV3RestoreSelection
  >();

  /**
   * Guarda una nueva selección v3 e invalida
   * cualquier selección v3 anterior.
   */
  save(selection: OtpvV3RestoreSelection): string {
    this.selections.clear();

    const selectionId: string = randomUUID();

    this.selections.set(selectionId, selection);

    return selectionId;
  }

  /**
   * Recupera una selección v3 por su identificador.
   */
  resolve(selectionId: string): OtpvV3RestoreSelection | null {
    return this.selections.get(selectionId) ?? null;
  }

  /**
   * Elimina cualquier selección v3 conservada.
   */
  clear(): void {
    this.selections.clear();
  }
}
