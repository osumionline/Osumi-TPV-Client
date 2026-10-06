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

export default interface BackupApi {
  /**
   * Crea una copia local completa de la instalación.
   */
  createLocal(): Promise<BackupCreateResult>;

  /**
   * Selecciona una copia o exportación `.otpv`
   * y determina el flujo necesario para recuperarla.
   */
  selectRestorePackage(): Promise<BackupRestorePackageSelectionResult>;

  /**
   * Autentica y descifra una copia v3 previamente seleccionada.
   */
  unlockRestorePackage(command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult>;

  /**
   * Promueve definitivamente una restauración
   * v3 previamente desbloqueada y preparada.
   */
  finalizeRestorePackage(selectionId: string): Promise<BackupRestoreFinalizeResult>;

  /**
   * Configura y valida las credenciales
   * de la instalación en TPV Backup.
   */
  configureRemote(credentials: BackupRemoteCredentials): Promise<BackupRemoteConnection>;

  /**
   * Obtiene el estado actual de la conexión
   * con TPV Backup.
   */
  getRemoteConnection(): Promise<BackupRemoteConnection | null>;

  /**
   * Elimina las credenciales locales
   * utilizadas para TPV Backup.
   */
  removeRemoteConfiguration(): Promise<void>;

  /**
   * Obtiene las copias remotas disponibles
   * para la instalación configurada.
   */
  getRemoteBackups(): Promise<readonly BackupRemoteBackup[]>;

  /**
   * Crea y almacena una nueva copia
   * directamente en TPV Backup.
   */
  createRemote(): Promise<BackupRemoteUploadResult>;

  /**
   * Descarga una copia remota al almacenamiento
   * local de copias de seguridad.
   */
  downloadRemote(publicId: string): Promise<BackupRemoteDownloadResult>;

  /**
   * Elimina una copia almacenada
   * en TPV Backup.
   */
  deleteRemote(publicId: string): Promise<void>;

  /**
   * Abre una sesión temporal con TPV Backup
   * para localizar una copia durante una restauración.
   */
  connectRemoteRestore(credentials: BackupRemoteCredentials): Promise<BackupRemoteRestoreAccess>;

  /**
   * Elimina la sesión temporal utilizada
   * durante una restauración remota.
   */
  disconnectRemoteRestore(): Promise<void>;
}
