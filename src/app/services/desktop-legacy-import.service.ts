import { Injectable } from '@angular/core';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

@Injectable({
  providedIn: 'root',
})
export default class DesktopLegacyImportService {
  selectPackage(): Promise<LegacyImportPackageSelectionResult> {
    return window.osumiDesktop.legacyImport.selectPackage();
  }
}
