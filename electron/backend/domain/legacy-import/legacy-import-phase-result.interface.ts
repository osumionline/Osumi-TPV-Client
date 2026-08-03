export default interface LegacyImportPhaseResult {
  readonly importedRows: number;

  readonly skippedRows: number;

  readonly warningCount: number;
}
