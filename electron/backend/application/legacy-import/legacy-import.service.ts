import type LegacyImportDialog from '@backend/contracts/legacy-import-dialog.interface';
import type LegacyImportDumpAnalyzer from '@backend/contracts/legacy-import-dump-analyzer.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import-package-inspector.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';

export default class LegacyImportService {
  constructor(
    private readonly dialog: LegacyImportDialog,

    private readonly packageInspector: LegacyImportPackageInspector,

    private readonly dumpAnalyzer: LegacyImportDumpAnalyzer,

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

      const selection: LegacyImportSelection = {
        packagePath,
        inspection,
      };

      const selectionId: string = this.selectionStore.save(selection);

      return {
        status: 'selected',

        package: {
          selectionId,
          ...inspection.summary,
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

  async analyzePackage(selectionId: string): Promise<LegacyImportAnalysisReport> {
    const selection: LegacyImportSelection | null = this.selectionStore.resolve(selectionId);

    if (selection === null) {
      throw new Error(
        ['La selección del paquete ha caducado', 'o ya no está disponible.'].join(' '),
      );
    }

    try {
      const analysis: LegacyImportPackageAnalysis = await this.dumpAnalyzer.analyze(
        selection.packagePath,
        selection.inspection.tableRows,
      );

      return {
        selectionId,
        ...analysis,
      };
    } catch (error: unknown) {
      console.error('Error analizando database.sql:', error);

      throw new Error('No se ha podido analizar la base de datos incluida en el paquete.', {
        cause: error,
      });
    }
  }
}
