import type BackupRemoteService from '@backend/application/backup/backup-remote.service';
import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type { BackupRemoteDownloadTransferResult } from '@backend/contracts/backup/backup-remote-client.interface';
import type BackupRemoteDownloader from '@backend/contracts/backup/backup-remote-downloader.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteDownloadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { randomUUID } from 'node:crypto';
import { rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Orquesta la descarga segura de una copia remota
 * hacia un directorio controlado.
 */
export default class BackupRemoteDownloadService implements BackupRemoteDownloader {
  private downloading: boolean = false;

  /**
   * Crea el servicio de descarga remota.
   */
  constructor(
    private readonly destinationDirectory: string,
    private readonly remoteService: BackupRemoteService,
  ) {}

  /**
   * Descarga una copia remota, valida su integridad
   * y la promueve atómicamente al directorio local.
   */
  async download(value: unknown): Promise<BackupRemoteDownloadResult> {
    if (this.downloading) {
      throw new Error('Ya se está descargando una copia remota.');
    }

    const publicId: string = this.normalizePublicId(value);

    this.downloading = true;

    const downloadId: string = randomUUID();

    const temporaryFile: string = join(
      this.destinationDirectory,
      `.remote-download-${downloadId}.tmp`,
    );
    const fileName: string = `osumi-tpv-backup-remote-${downloadId}.otpv`;

    const destinationFile: string = join(this.destinationDirectory, fileName);

    let promoted: boolean = false;

    try {
      const backup: BackupRemoteBackup = await this.loadRequiredBackup(publicId);

      const transfer: BackupRemoteDownloadTransferResult = await this.remoteService.download(
        backup.publicId,
        temporaryFile,
      );

      this.assertTransferMatches(backup, transfer);

      await rename(temporaryFile, destinationFile);

      promoted = true;

      return {
        publicId: backup.publicId,
        backupId: backup.backupId,
        originalFilename: backup.originalFilename,
        fileName,
        sizeBytes: transfer.sizeBytes,
        sha256: transfer.sha256,
      };
    } finally {
      if (!promoted) {
        await this.removeTemporaryFileSafely(temporaryFile);
      }

      this.downloading = false;
    }
  }

  /**
   * Valida el identificador recibido desde IPC.
   */
  private normalizePublicId(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('El identificador de la copia remota no es válido.');
    }

    const publicId: string = value.trim();

    if (publicId === '') {
      throw new Error('El identificador de la copia remota no puede estar vacío.');
    }

    return publicId;
  }

  /**
   * Obtiene desde el servidor los metadatos
   * autoritativos de la copia solicitada.
   */
  private async loadRequiredBackup(publicId: string): Promise<BackupRemoteBackup> {
    const backups: readonly BackupRemoteBackup[] = await this.remoteService.list();

    const backup: BackupRemoteBackup | undefined = backups.find(
      (candidate: BackupRemoteBackup): boolean => candidate.publicId === publicId,
    );

    if (backup === undefined) {
      throw new BackupRemoteClientError('not-found', 'La copia remota solicitada no existe.', 404);
    }

    return backup;
  }

  /**
   * Comprueba que los bytes descargados coincidan
   * con los metadatos almacenados en TPV Backup.
   */
  private assertTransferMatches(
    backup: BackupRemoteBackup,
    transfer: BackupRemoteDownloadTransferResult,
  ): void {
    if (
      transfer.sizeBytes === backup.sizeBytes &&
      transfer.sha256.toLowerCase() === backup.sha256.toLowerCase()
    ) {
      return;
    }

    throw new BackupRemoteClientError(
      'invalid-backup',
      'La copia descargada no coincide con los metadatos de integridad almacenados en TPV Backup.',
    );
  }

  /**
   * Elimina una descarga temporal sin ocultar
   * el error que originó la limpieza.
   */
  private async removeTemporaryFileSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido eliminar una descarga temporal de TPV Backup:', error);
    }
  }
}
