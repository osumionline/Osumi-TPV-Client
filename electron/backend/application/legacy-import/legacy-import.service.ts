import type LegacyImportDialog from '@backend/contracts/legacy-import-dialog.interface';
import type LegacyImportDumpAnalyzer from '@backend/contracts/legacy-import-dump-analyzer.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import-package-inspector.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportReviewDecisionValidator from '@backend/contracts/legacy-import-review-decision-validator.interface';
import type LegacyImportRunner from '@backend/contracts/legacy-import-runner.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import-selection-store.interface';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import { LEGACY_IMPORT_APPLICATION_NAME } from '@backend/domain/legacy-import/legacy-import.constants';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';

export default class LegacyImportService {
  private activeImportSelectionId: string | null = null;

  constructor(
    private readonly dialog: LegacyImportDialog,
    private readonly packageInspector: LegacyImportPackageInspector,
    private readonly dumpAnalyzer: LegacyImportDumpAnalyzer,
    private readonly reviewDecisionValidator: LegacyImportReviewDecisionValidator,
    private readonly importRunner: LegacyImportRunner,
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
        executionResult: null,
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

  async startImport(
    selectionId: string,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportStartResult> {
    const selection: LegacyImportSelection | null = this.selectionStore.resolve(selectionId);

    if (selection === null) {
      throw new Error(
        ['La selección del paquete ha caducado', 'o ya no está disponible.'].join(' '),
      );
    }

    if (selection.analysis === null) {
      throw new Error('El paquete debe analizarse antes de iniciar la importación.');
    }

    if (selection.reviewConfirmedAt === null) {
      throw new Error(
        ['Las decisiones del análisis', 'deben confirmarse antes de importar.'].join(' '),
      );
    }

    if (selection.executionResult !== null) {
      return selection.executionResult;
    }

    if (this.activeImportSelectionId !== null) {
      throw new Error('Ya existe una importación en curso.');
    }

    this.activeImportSelectionId = selectionId;

    const startedAt: string = new Date().toISOString();

    const command: LegacyImportExecutionCommand = {
      selectionId,
      packagePath: selection.packagePath,
      sourceApplication: LEGACY_IMPORT_APPLICATION_NAME,
      sourceVersion: selection.inspection.summary.applicationVersion,
      sourceSchemaVersion: selection.inspection.summary.schemaVersion,
      sourceHash: selection.inspection.packageSha256,
      sourceRows: selection.inspection.summary.totalRows,
      expectedTableRows: selection.inspection.tableRows,
      fileInventory: selection.inspection.fileInventory,
      reviewDecisions: selection.reviewDecisions,
      warningCount: selection.inspection.summary.warnings.length,
      startedAt,
    };

    try {
      const result: LegacyImportStartResult = await this.importRunner.run(
        command,
        progressListener,
      );

      this.selectionStore.setExecutionResult(selectionId, result);

      return result;
    } catch (error: unknown) {
      console.error('Error preparando la importación legacy:', error);

      throw new Error('No se ha podido preparar la base de datos temporal de importación.', {
        cause: error,
      });
    } finally {
      this.activeImportSelectionId = null;
    }
  }
}
