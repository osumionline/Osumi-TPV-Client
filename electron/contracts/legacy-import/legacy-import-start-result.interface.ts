export default interface LegacyImportStartResult {
  readonly status: 'database-prepared';

  readonly selectionId: string;

  readonly startedAt: string;

  readonly completedAt: string;

  readonly sourceRows: number;

  readonly importedRows: number;

  readonly skippedRows: number;

  readonly warningCount: number;
}
