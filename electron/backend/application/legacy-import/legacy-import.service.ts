import type LegacyImportDialog from '@backend/contracts/legacy-import-dialog.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import-package-inspector.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.type';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

export default class LegacyImportService {
  constructor(
    private readonly dialog: LegacyImportDialog,
    private readonly packageInspector: LegacyImportPackageInspector,
    private readonly selectionStore: LegacyImportSelectionStore,
  ) {}

  async selectPackage(): Promise<LegacyImportPackageSelectionResult> {
    const packagePath: string | null = await this.dialog.selectPackage();

    if (packagePath === null) {
      return {
        status: 'cancelled',
      };
    }

    try {
      const inspection: LegacyImportPackageInspection =
        await this.packageInspector.inspect(packagePath);

      const selectionId: string = this.selectionStore.save(packagePath);

      return {
        status: 'selected',
        package: {
          selectionId,
          ...inspection,
        },
      };
    } catch (error: unknown) {
      this.selectionStore.clear();

      console.error('Error inspeccionando el paquete .otpv:', error);

      throw new Error('El paquete seleccionado no es una exportación válida de Osumi TPV.', {
        cause: error,
      });
    }
  }
}
