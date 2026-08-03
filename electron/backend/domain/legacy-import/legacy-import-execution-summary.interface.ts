export default interface LegacyImportExecutionSummary {
  readonly importedRows: number;

  readonly skippedRows: number;

  readonly warningCount: number;
}
