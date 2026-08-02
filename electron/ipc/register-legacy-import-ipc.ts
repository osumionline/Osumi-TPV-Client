import type LegacyImportService from '@backend/application/legacy-import/legacy-import.service';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
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
}
