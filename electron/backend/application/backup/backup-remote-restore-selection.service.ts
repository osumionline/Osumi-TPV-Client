import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type BackupRemoteDownloader from '@backend/contracts/backup/backup-remote-downloader.interface';
import type BackupRestorePackageSelector from '@backend/contracts/backup/backup-restore-package-selector.interface';
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
      await this.clear();

      const download: BackupRemoteDownloadResult = await this.remoteDownloader.download(publicId);

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

    throw new BackupRemoteClientError(
      'invalid-backup',
      'La copia descargada desde TPV Backup no coincide con sus metadatos de restauración.',
    );
  }

  /**
   * Limpia el paquete temporal sin ocultar
   * el error principal.
   */
  private async clearSafely(): Promise<void> {
    try {
      await this.clear();
    } catch (error: unknown) {
      console.error(
        'No se ha podido limpiar la copia temporal utilizada para restauración remota:',
        error,
      );
    }
  }
}
