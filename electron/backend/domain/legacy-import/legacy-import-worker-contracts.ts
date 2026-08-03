import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

export interface LegacyImportWorkerData {
  readonly command: LegacyImportExecutionCommand;

  readonly databaseFile: string;

  readonly applicationVersion: string;
}

export interface LegacyImportWorkerProgressMessage {
  readonly type: 'progress';

  readonly progress: LegacyImportProgress;
}

export interface LegacyImportWorkerCompletedMessage {
  readonly type: 'completed';

  readonly result: LegacyImportStartResult;
}

export interface LegacyImportWorkerFailedMessage {
  readonly type: 'failed';

  readonly message: string;

  readonly stack: string | null;
}

export type LegacyImportWorkerMessage =
  | LegacyImportWorkerProgressMessage
  | LegacyImportWorkerCompletedMessage
  | LegacyImportWorkerFailedMessage;
