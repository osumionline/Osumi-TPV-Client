import type BackupRemoteRestoreSelectionService from '@backend/application/backup/backup-remote-restore-selection.service';
import type BackupRemoteService from '@backend/application/backup/backup-remote.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteRestoreAccess,
} from '@desktop-contracts/backup/backup-remote.interface';

type RemoteRestoreService = Pick<BackupRemoteService, 'removeConfiguration' | 'configure' | 'list'>;

type RemoteRestoreSelectionCleaner = Pick<BackupRemoteRestoreSelectionService, 'clear'>;

/**
 * Coordina la sesión temporal utilizada exclusivamente
 * durante una restauración desde TPV Backup.
 */
export default class BackupRemoteRestoreSessionService {
  /**
   * Crea el coordinador sobre la sesión remota,
   * la selección temporal y el logger de aplicación.
   */
  constructor(
    private readonly remoteService: RemoteRestoreService,
    private readonly selectionCleaner: RemoteRestoreSelectionCleaner,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Invalida cualquier sesión temporal anterior,
   * autentica las credenciales y recupera las copias.
   */
  async connect(credentials: unknown): Promise<BackupRemoteRestoreAccess> {
    await this.remoteService.removeConfiguration();

    const connection: BackupRemoteConnection = await this.remoteService.configure(credentials);

    try {
      const backups: readonly BackupRemoteBackup[] = await this.remoteService.list();

      return {
        connection,
        backups,
      };
    } catch (error: unknown) {
      await this.clearCredentialsAfterConnectFailure();

      throw error;
    }
  }

  /**
   * Cierra completamente el restore remoto conservando
   * siempre como principal el primer fallo producido.
   */
  async disconnect(): Promise<void> {
    let selectionError: unknown = null;
    let selectionFailed: boolean = false;

    try {
      await this.selectionCleaner.clear();
    } catch (error: unknown) {
      selectionError = error;
      selectionFailed = true;
    }

    try {
      await this.remoteService.removeConfiguration();
    } catch (error: unknown) {
      if (!selectionFailed) {
        throw error;
      }

      this.applicationLogger.warn({
        area: 'backup',
        operation: 'cleanup-remote-restore-credentials-after-disconnect-error',
        message:
          'No se han podido limpiar las credenciales temporales después de fallar el cierre de la restauración remota.',
        error,
      });
    }

    if (selectionFailed) {
      throw selectionError;
    }
  }

  /**
   * Elimina las credenciales temporales después
   * de una conexión incompleta sin ocultar su fallo principal.
   */
  private async clearCredentialsAfterConnectFailure(): Promise<void> {
    try {
      await this.remoteService.removeConfiguration();
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'cleanup-remote-restore-credentials-after-connect-error',
        message:
          'No se han podido limpiar las credenciales temporales después de fallar la conexión de restauración.',
        error,
      });
    }
  }
}
