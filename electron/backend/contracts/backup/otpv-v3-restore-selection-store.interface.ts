import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';

export default interface OtpvV3RestoreSelectionStore {
  /**
   * Guarda una nueva selección v3 e invalida
   * cualquier selección v3 anterior.
   */
  save(selection: OtpvV3RestoreSelection): string;

  /**
   * Recupera una selección v3 por su identificador.
   */
  resolve(selectionId: string): OtpvV3RestoreSelection | null;

  /**
   * Elimina cualquier selección v3 conservada.
   */
  clear(): void;
}
