import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type OtpvV3RestoreSelectionStore from '@backend/contracts/backup/otpv-v3-restore-selection-store.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import/legacy-import-package-inspector.interface';
import type LegacyImportSelectionStore from '@backend/contracts/legacy-import/legacy-import-selection-store.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import type OtpvPackageSelectionResult from '@backend/domain/backup/otpv-package-selection-result.type';
import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';

/**
 * Identifica un paquete `.otpv` y conserva
 * la selección en el flujo correspondiente.
 */
export default class OtpvPackageSelectionService {
  constructor(
    private readonly packageInspector: OtpvPackageInspector,
    private readonly legacyPackageInspector: LegacyImportPackageInspector,
    private readonly legacySelectionStore: LegacyImportSelectionStore,
    private readonly v3RestoreSelectionStore: OtpvV3RestoreSelectionStore,
  ) {}

  /**
   * Inspecciona el paquete y lo enruta al flujo
   * legacy v2 o a la restauración nativa v3.
   */
  async select(packagePath: string): Promise<OtpvPackageSelectionResult> {
    this.clearSelections();

    const inspection: OtpvPackageInspection = await this.packageInspector.inspect(packagePath);

    if (inspection.formatVersion === LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION) {
      return this.selectLegacyPackage(packagePath);
    }

    if (inspection.formatVersion === OTPV_V3_FORMAT_VERSION) {
      const selection: OtpvV3RestoreSelection = {
        packagePath,
        manifest: inspection.manifest,
      };

      const selectionId: string = this.v3RestoreSelectionStore.save(selection);

      return {
        mode: 'native-restore',
        formatVersion: OTPV_V3_FORMAT_VERSION,
        selectionId,
        manifest: inspection.manifest,
      };
    }

    /*
     * OtpvPackageInspection ya es exhaustivo,
     * pero mantenemos una defensa explícita por
     * si el contrato se amplía en el futuro.
     */
    throw new Error('El formato .otpv seleccionado no está soportado.');
  }

  /**
   * Ejecuta la validación completa legacy y conserva
   * la selección en el store ya utilizado por v2.
   */
  private async selectLegacyPackage(packagePath: string): Promise<OtpvPackageSelectionResult> {
    const inspection: LegacyImportPackageInspection =
      await this.legacyPackageInspector.inspect(packagePath);

    const selection: LegacyImportSelection = {
      packagePath,
      inspection,
      analysis: null,
      reviewDecisions: [],
      reviewConfirmedAt: null,
      executionResult: null,
    };

    const selectionId: string = this.legacySelectionStore.save(selection);

    return {
      mode: 'legacy-import',
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      selectionId,
      inspection,
    };
  }

  /**
   * Invalida cualquier selección anterior antes
   * de empezar a procesar un paquete nuevo.
   */
  private clearSelections(): void {
    this.legacySelectionStore.clear();
    this.v3RestoreSelectionStore.clear();
  }
}
