export default interface LegacyImportExecutionCommand {
  readonly selectionId: string;

  readonly sourceApplication: string;

  readonly sourceVersion: string;

  readonly sourceSchemaVersion: string;

  readonly sourceHash: string;

  readonly sourceRows: number;

  readonly warningCount: number;

  readonly startedAt: string;
}
