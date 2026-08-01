import type LegacyImportService from '@backend/application/legacy-import/legacy-import.service';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import ipcChannels from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerLegacyImportIpc(legacyImportService: LegacyImportService): void {
  ipcMain.handle(
    ipcChannels.legacyImportSelectPackage,

    async (): Promise<LegacyImportPackageSelectionResult> => legacyImportService.selectPackage(),
  );
}
