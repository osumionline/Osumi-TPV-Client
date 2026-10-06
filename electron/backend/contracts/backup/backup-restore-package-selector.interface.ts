import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';

/**
 * Registra un paquete como selección
 * utilizable por el pipeline de restauración.
 */
export default interface BackupRestorePackageSelector {
  selectPackagePath(
    packagePath: string,
    fileName?: string,
  ): Promise<BackupRestorePackageSelectionResult>;
}
