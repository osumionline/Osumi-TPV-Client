import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

export default interface LegacyImportRunner {
  run(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportStartResult>;
}
