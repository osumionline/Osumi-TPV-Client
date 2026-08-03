export default interface LegacyImportPreparationResult {
  readonly status: 'ready-for-import';

  readonly selectionId: string;

  readonly confirmedAt: string;

  readonly conflicts: number;

  readonly decisions: number;
}
