import type LegacyImportService from '@backend/application/legacy-import/legacy-import.service';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import ipcChannels from '@ipc/channels';
import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';

export default function registerLegacyImportIpc(legacyImportService: LegacyImportService): void {
  ipcMain.handle(
    ipcChannels.legacyImportSelectPackage,

    async (): Promise<LegacyImportPackageSelectionResult> => legacyImportService.selectPackage(),
  );

  ipcMain.handle(
    ipcChannels.legacyImportAnalyzePackage,

    async (_event: IpcMainInvokeEvent, selectionId: string): Promise<LegacyImportAnalysisReport> =>
      legacyImportService.analyzePackage(selectionId),
  );

  ipcMain.handle(
    ipcChannels.legacyImportConfirmReviewDecisions,

    async (
      _event: IpcMainInvokeEvent,
      selectionId: string,
      decisions: readonly LegacyImportReviewDecision[],
    ): Promise<LegacyImportPreparationResult> =>
      legacyImportService.confirmReviewDecisions(selectionId, decisions),
  );
}
