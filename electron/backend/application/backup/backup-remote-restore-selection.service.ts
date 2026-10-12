import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type BackupRemoteDownloader from '@backend/contracts/backup/backup-remote-downloader.interface';
import type BackupRestorePackageSelector from '@backend/contracts/backup/backup-restore-package-selector.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { BackupRemoteDownloadResult } from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Descarga una copia desde TPV Backup y la registra
 * como selección del pipeline nativo de restauración.
 */
export default class BackupRemoteRestoreSelectionService {
  private selecting: boolean = false;

  /**
   * Crea el coordinador de restauración remota.
   */
  constructor(
    private readonly downloadDirectory: string,
    private readonly remoteDownloader: BackupRemoteDownloader,
    private readonly packageSelector: BackupRestorePackageSelector,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Descarga, verifica e inspecciona una copia remota
   * antes de entregarla al flujo de restore v3.
   */
  async select(publicId: unknown): Promise<BackupRestorePackageSelectionResult> {
    if (this.selecting) {
      throw new Error('Ya se está preparando una copia remota para restauración.');
    }

    this.selecting = true;

    try {
      /*
       * Solo conservamos un paquete remoto temporal.
       */
      await this.clearBeforeSelection();

      const download: BackupRemoteDownloadResult = await this.downloadForRestore(publicId);

      const packagePath: string = join(this.downloadDirectory, download.fileName);

      const selection: BackupRestorePackageSelectionResult =
        await this.packageSelector.selectPackagePath(packagePath, download.originalFilename);

      this.assertNativeSelection(selection, download);

      return selection;
    } catch (error: unknown) {
      await this.clearSafely();

      throw error;
    } finally {
      this.selecting = false;
    }
  }

  /**
   * Elimina cualquier paquete remoto temporal
   * conservado por este flujo.
   */
  async clear(): Promise<void> {
    await rm(this.downloadDirectory, {
      recursive: true,
      force: true,
    });
  }

  /**
   * Limpia el área temporal antes de iniciar una
   * nueva selección de restauración remota.
   */
  private async clearBeforeSelection(): Promise<void> {
    try {
      await this.clear();
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'prepare-remote-restore-directory',
        message:
          'No se ha podido limpiar el área temporal antes de preparar una restauración remota.',
        error,
      });

      throw error;
    }
  }

  /**
   * Descarga la copia remota dejando el diagnóstico
   * funcional en esta frontera de restauración.
   */
  private async downloadForRestore(value: unknown): Promise<BackupRemoteDownloadResult> {
    try {
      return await this.remoteDownloader.download(value);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'download-remote-restore-package',
        message: 'No se ha podido descargar la copia remota para preparar su restauración.',
        error,
      });

      throw error;
    }
  }

  /**
   * Comprueba que el paquete inspeccionado
   * sea exactamente la copia remota descargada.
   */
  private assertNativeSelection(
    selection: BackupRestorePackageSelectionResult,
    download: BackupRemoteDownloadResult,
  ): void {
    if (
      selection.status === 'selected' &&
      selection.mode === 'native-restore' &&
      selection.backupId === download.backupId
    ) {
      return;
    }

    const error = new BackupRemoteClientError(
      'invalid-backup',
      'La copia descargada desde TPV Backup no coincide con sus metadatos de restauración.',
    );

    this.applicationLogger.warn({
      area: 'backup',
      operation: 'validate-remote-restore-package',
      message:
        'La copia remota preparada no coincide con los metadatos esperados para la restauración.',
      error,
    });

    throw error;
  }

  /**
   * Limpia el paquete temporal sin ocultar
   * el error principal.
   */
  private async clearSafely(): Promise<void> {
    try {
      await this.clear();
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'cleanup-remote-restore-package',
        message: 'No se ha podido limpiar el paquete temporal de restauración remota.',
        error,
      });
    }
  }
}
