import type LegacyImportDialog from '@backend/contracts/legacy-import-dialog.interface';
import type LegacyImportDumpAnalyzer from '@backend/contracts/legacy-import-dump-analyzer.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import-package-inspector.interface';
import type LegacyImportReviewDecisionValidator from '@backend/contracts/legacy-import-review-decision-validator.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default class LegacyImportService {
  constructor(
    private readonly dialog: LegacyImportDialog,
    private readonly packageInspector: LegacyImportPackageInspector,
    private readonly dumpAnalyzer: LegacyImportDumpAnalyzer,
    private readonly reviewDecisionValidator: LegacyImportReviewDecisionValidator,
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
        analysis: null,
        reviewDecisions: [],
        reviewConfirmedAt: null,
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

      this.selectionStore.setAnalysis(selectionId, analysis);

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

  async confirmReviewDecisions(
    selectionId: string,
    decisions: readonly LegacyImportReviewDecision[],
  ): Promise<LegacyImportPreparationResult> {
    const selection: LegacyImportSelection | null = this.selectionStore.resolve(selectionId);

    if (selection === null) {
      throw new Error(
        ['La selección del paquete ha caducado', 'o ya no está disponible.'].join(' '),
      );
    }

    if (selection.analysis === null) {
      throw new Error('El paquete debe analizarse antes de confirmar las decisiones.');
    }

    if (selection.analysis.requiresReview && selection.analysis.reviewConflicts.length === 0) {
      throw new Error(
        [
          'El análisis indica que existen problemas',
          'para revisar, pero no incluye sus conflictos.',
        ].join(' '),
      );
    }

    try {
      const normalizedDecisions: readonly LegacyImportReviewDecision[] =
        this.reviewDecisionValidator.validate(selection.analysis.reviewConflicts, decisions);

      const confirmedAt: string = new Date().toISOString();

      this.selectionStore.setReviewDecisions(selectionId, normalizedDecisions, confirmedAt);

      return {
        status: 'ready-for-import',
        selectionId,
        confirmedAt,
        conflicts: selection.analysis.reviewConflicts.length,
        decisions: normalizedDecisions.length,
      };
    } catch (error: unknown) {
      console.error('Error validando las decisiones de importación:', error);

      throw new Error('Las decisiones indicadas no son válidas para el análisis actual.', {
        cause: error,
      });
    }
  }
}
