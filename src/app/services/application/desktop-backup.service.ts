import { Service } from '@angular/core';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteCredentials,
  BackupRemoteDownloadResult,
  BackupRemoteRestoreAccess,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';

@Service()
export default class DesktopBackupService {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult> {
    return window.osumiDesktop.backup.createLocal();
  }

  /**
   * Selecciona un `.otpv` para recuperación.
   */
  selectRestorePackage(): Promise<BackupRestorePackageSelectionResult> {
    return window.osumiDesktop.backup.selectRestorePackage();
  }

  /**
   * Autentica y descifra una copia v3 seleccionada.
   */
  unlockRestorePackage(command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult> {
    return window.osumiDesktop.backup.unlockRestorePackage(command);
  }

  /**
   * Activa una restauración v3 ya preparada.
   */
  finalizeRestorePackage(selectionId: string): Promise<BackupRestoreFinalizeResult> {
    return window.osumiDesktop.backup.finalizeRestorePackage(selectionId);
  }

  /**
   * Configura las credenciales remotas de TPV Backup.
   */
  configureRemote(credentials: BackupRemoteCredentials): Promise<BackupRemoteConnection> {
    return window.osumiDesktop.backup.configureRemote(credentials);
  }

  /**
   * Obtiene el estado de la conexión remota actual.
   */
  getRemoteConnection(): Promise<BackupRemoteConnection | null> {
    return window.osumiDesktop.backup.getRemoteConnection();
  }

  /**
   * Elimina la configuración local de TPV Backup.
   */
  removeRemoteConfiguration(): Promise<void> {
    return window.osumiDesktop.backup.removeRemoteConfiguration();
  }

  /**
   * Obtiene el listado de copias almacenadas
   * en TPV Backup.
   */
  getRemoteBackups(): Promise<readonly BackupRemoteBackup[]> {
    return window.osumiDesktop.backup.getRemoteBackups();
  }

  /**
   * Crea y sube una nueva copia a TPV Backup.
   */
  createRemote(): Promise<BackupRemoteUploadResult> {
    return window.osumiDesktop.backup.createRemote();
  }

  /**
   * Descarga una copia remota al directorio
   * local de backups.
   */
  downloadRemote(publicId: string): Promise<BackupRemoteDownloadResult> {
    return window.osumiDesktop.backup.downloadRemote(publicId);
  }

  /**
   * Elimina una copia almacenada
   * en TPV Backup.
   */
  deleteRemote(publicId: string): Promise<void> {
    return window.osumiDesktop.backup.deleteRemote(publicId);
  }

  /**
   * Abre una sesión temporal con TPV Backup
   * durante una restauración.
   */
  connectRemoteRestore(credentials: BackupRemoteCredentials): Promise<BackupRemoteRestoreAccess> {
    return window.osumiDesktop.backup.connectRemoteRestore(credentials);
  }

  /**
   * Elimina la sesión remota temporal
   * utilizada durante una restauración.
   */
  disconnectRemoteRestore(): Promise<void> {
    return window.osumiDesktop.backup.disconnectRemoteRestore();
  }
}
