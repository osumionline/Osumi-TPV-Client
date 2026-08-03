import type LegacyImportExecutionStage from '@desktop-contracts/legacy-import/legacy-import-execution-stage.type';

export default interface LegacyImportProgress {
  readonly selectionId: string;

  readonly stage: LegacyImportExecutionStage;

  readonly percentage: number;

  readonly message: string;
}
