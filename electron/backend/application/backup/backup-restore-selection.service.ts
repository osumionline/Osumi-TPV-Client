import type OtpvPackageSelectionService from '@backend/application/backup/otpv-package-selection.service';
import type OtpvPackageDialog from '@backend/contracts/backup/otpv-package-dialog.interface';
import type OtpvPackageSelectionResult from '@backend/domain/backup/otpv-package-selection-result.type';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import { basename } from 'node:path';

/**
 * Coordina la selección de un `.otpv`
 * y expone únicamente sus metadatos públicos.
 */
export default class BackupRestoreSelectionService {
  /**
   * Crea el servicio de selección de restauración.
   */
  constructor(
    private readonly dialog: OtpvPackageDialog,
    private readonly packageSelectionService: OtpvPackageSelectionService,
  ) {}

  /**
   * Permite seleccionar un `.otpv` y lo enruta
   * hacia importación legacy o restauración nativa.
   */
  async selectPackage(): Promise<BackupRestorePackageSelectionResult> {
    const packagePath: string | null = await this.dialog.selectPackage();

    if (packagePath === null) {
      return {
        status: 'cancelled',
      };
    }

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
        fileName: basename(packagePath),
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
