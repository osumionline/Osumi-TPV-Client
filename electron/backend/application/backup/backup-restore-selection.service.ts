import type OtpvPackageSelectionService from '@backend/application/backup/otpv-package-selection.service';
import type BackupRestorePackageSelector from '@backend/contracts/backup/backup-restore-package-selector.interface';
import type OtpvPackageDialog from '@backend/contracts/backup/otpv-package-dialog.interface';
import type OtpvV3PreparedRestoreStore from '@backend/contracts/backup/otpv-v3-prepared-restore-store.interface';
import type OtpvV3RestoreStagingPreparer from '@backend/contracts/backup/otpv-v3-restore-staging-preparer.interface';
import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type OtpvPackageSelectionResult from '@backend/domain/backup/otpv-package-selection-result.type';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import { basename, win32 } from 'node:path';

/**
 * Obtiene el nombre de presentación de un paquete
 * independientemente del formato de ruta recibido.
 *
 * Los diálogos nativos utilizan rutas de la plataforma
 * actual, pero los flujos y tests pueden manejar también
 * rutas Windows en otros sistemas operativos.
 */
function resolvePackageFileName(packagePath: string): string {
  if (win32.isAbsolute(packagePath)) {
    return win32.basename(packagePath);
  }

  return basename(packagePath);
}

/**
 * Coordina la selección de un `.otpv`
 * y expone únicamente sus metadatos públicos.
 */
export default class BackupRestoreSelectionService implements BackupRestorePackageSelector {
  /**
   * Crea el servicio de selección de restauración.
   */
  constructor(
    private readonly dialog: OtpvPackageDialog,
    private readonly packageSelectionService: OtpvPackageSelectionService,
    private readonly restoreWorkspace: OtpvV3RestoreWorkspace,
    private readonly restoreStagingPreparer: OtpvV3RestoreStagingPreparer,
    private readonly preparedRestoreStore: OtpvV3PreparedRestoreStore,
  ) {}

  /**
   * Permite seleccionar un `.otpv` mediante diálogo
   * y lo enruta hacia el flujo correspondiente.
   */
  async selectPackage(): Promise<BackupRestorePackageSelectionResult> {
    const packagePath: string | null = await this.dialog.selectPackage();

    if (packagePath === null) {
      return {
        status: 'cancelled',
      };
    }

    return this.selectPackagePath(packagePath);
  }

  /**
   * Registra directamente un `.otpv` ya disponible
   * en una ruta controlada por el proceso principal.
   *
   * fileName permite conservar un nombre de presentación
   * distinto del nombre físico temporal.
   */
  async selectPackagePath(
    packagePath: string,
    fileName: string = resolvePackageFileName(packagePath),
  ): Promise<BackupRestorePackageSelectionResult> {
    this.preparedRestoreStore.clear();

    await Promise.all([this.restoreWorkspace.clear(), this.restoreStagingPreparer.clear()]);

    try {
      const selection: OtpvPackageSelectionResult =
        await this.packageSelectionService.select(packagePath);

      if (selection.mode === 'legacy-import') {
        return {
          status: 'selected',
          mode: 'legacy-import',
          selectionId: selection.selectionId,
          formatVersion: selection.formatVersion,
          fileName: selection.inspection.summary.fileName,
          applicationVersion: selection.inspection.summary.applicationVersion,
          schemaVersion: selection.inspection.summary.schemaVersion,
          createdAt: selection.inspection.summary.createdAt,
        };
      }

      return {
        status: 'selected',
        mode: 'native-restore',
        selectionId: selection.selectionId,
        formatVersion: selection.formatVersion,
        fileName,
        backupId: selection.manifest.backupId,
        applicationVersion: selection.manifest.applicationVersion,
        databaseSchemaVersion: selection.manifest.databaseSchemaVersion,
        createdAt: selection.manifest.createdAt,
      };
    } catch (error: unknown) {
      console.error('Error inspeccionando el paquete .otpv seleccionado:', error);

      throw new Error(
        'El archivo seleccionado no es una copia o exportación válida de Osumi TPV.',
        {
          cause: error,
        },
      );
    }
  }
}
