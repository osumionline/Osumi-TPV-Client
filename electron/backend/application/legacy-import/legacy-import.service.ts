import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type LegacyImportDialog from '@backend/contracts/legacy-import/legacy-import-dialog.interface';
import type LegacyImportDumpAnalyzer from '@backend/contracts/legacy-import/legacy-import-dump-analyzer.interface';
import type LegacyImportPackageConfigurationReader from '@backend/contracts/legacy-import/legacy-import-package-configuration-reader.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import/legacy-import-package-inspector.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import/legacy-import-progress-listener.type';
import type LegacyImportReviewDecisionValidator from '@backend/contracts/legacy-import/legacy-import-review-decision-validator.interface';
import type LegacyImportRunner from '@backend/contracts/legacy-import/legacy-import-runner.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import/legacy-import-selection-store.interface';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import LegacyImportPackageConfiguration from '@backend/domain/legacy-import/legacy-import-package-configuration.interface';
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
    private readonly packageConfigurationReader: LegacyImportPackageConfigurationReader,
    private readonly dumpAnalyzer: LegacyImportDumpAnalyzer,
    private readonly reviewDecisionValidator: LegacyImportReviewDecisionValidator,
    private readonly importRunner: LegacyImportRunner,
    private readonly selectionStore: LegacyImportSelectionStore,
    private readonly stagingAppDataRepository: AppDataRepository,
    private readonly stagingLogoStorage: LogoStorage,
    private readonly stagingSecretStorage: SecretStorage,
    private readonly installationFinalizer: InstallationFinalizer,
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

    try {
      progressListener({
        selectionId,
        stage: 'reading-package-configuration',
        percentage: 5,
        message: 'Leyendo la configuración y el logo del paquete…',
      });

      const packageConfiguration: LegacyImportPackageConfiguration =
        await this.packageConfigurationReader.read(
          selection.packagePath,
          selection.inspection.packageSha256,
          selection.inspection.fileInventory,
          startedAt,
        );

      const command: LegacyImportExecutionCommand = {
        selectionId,
        packagePath: selection.packagePath,
        sourceApplication: LEGACY_IMPORT_APPLICATION_NAME,
        sourceVersion: selection.inspection.summary.applicationVersion,
        sourceSchemaVersion: selection.inspection.summary.schemaVersion,
        sourceHash: selection.inspection.packageSha256,
        sourceRows: selection.inspection.summary.totalRows,
        initialSaleNumber: packageConfiguration.initialSaleNumber,
        initialInvoiceNumber: packageConfiguration.initialInvoiceNumber,
        expectedTableRows: selection.inspection.tableRows,
        fileInventory: selection.inspection.fileInventory,
        reviewDecisions: selection.reviewDecisions,
        warningCount: selection.inspection.summary.warnings.length,
        startedAt,
      };

      const stagingResult: LegacyImportStartResult = await this.importRunner.run(
        command,
        progressListener,
      );

      progressListener({
        selectionId,
        stage: 'preparing-application-files',
        percentage: 99,
        message: 'Preparando configuración, logo y secretos…',
      });

      /*
       * No se utiliza InstallationStaging.prepare()
       * porque borraría la base y los archivos que el
       * Worker acaba de crear.
       *
       * app_data.json se escribe el último y actúa como
       * marcador de que el staging está completo.
       */
      await this.stagingLogoStorage.save(packageConfiguration.logo);

      await this.stagingSecretStorage.save(packageConfiguration.secrets);

      await this.stagingAppDataRepository.save(packageConfiguration.appData);

      progressListener({
        selectionId,
        stage: 'promoting-installation',
        percentage: 99,
        message: 'Activando la instalación importada…',
      });

      await this.installationFinalizer.finalize();

      const completedAt: string = new Date().toISOString();

      const result: LegacyImportStartResult = {
        ...stagingResult,
        status: 'installed',
        completedAt,
      };

      this.selectionStore.setExecutionResult(selectionId, result);

      progressListener({
        selectionId,
        stage: 'completed',
        percentage: 100,
        message: 'La importación se ha completado y la instalación está activa.',
      });

      return result;
    } catch (error: unknown) {
      console.error('Error completando la importación legacy:', error);

      try {
        await this.installationFinalizer.recover();
      } catch (recoveryError: unknown) {
        console.error('No se ha podido recuperar la instalación interrumpida:', recoveryError);
      }

      throw new Error('No se ha podido completar la importación e instalación.', {
        cause: error,
      });
    } finally {
      this.activeImportSelectionId = null;
    }
  }
}
