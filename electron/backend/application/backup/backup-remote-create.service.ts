import type BackupRemoteService from '@backend/application/backup/backup-remote.service';
import type BackupService from '@backend/application/backup/backup.service';
import type BackupCreatedFile from '@backend/contracts/backup/backup-created-file.interface';
import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type BackupRemoteCreator from '@backend/contracts/backup/backup-remote-creator.interface';
import type {
  BackupRemoteConnection,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { rm } from 'node:fs/promises';

/**
 * Orquesta la creación temporal y subida
 * de una copia a TPV Backup.
 */
export default class BackupRemoteCreateService implements BackupRemoteCreator {
  private creating: boolean = false;

  /**
   * Crea el servicio de generación remota.
   */
  constructor(
    private readonly temporaryDirectory: string,
    private readonly backupService: BackupService,
    private readonly remoteService: BackupRemoteService,
  ) {}

  /**
   * Genera una copia temporal, la sube
   * y elimina después el fichero local.
   */
  async create(): Promise<BackupRemoteUploadResult> {
    if (this.creating) {
      throw new Error('Ya se está creando una copia remota.');
    }

    this.creating = true;

    let backup: BackupCreatedFile | null = null;

    try {
      const connection: BackupRemoteConnection | null = await this.remoteService.getConnection();

      if (connection === null) {
        throw new Error('La instalación no tiene configuradas las credenciales de TPV Backup.');
      }

      if (!connection.canUpload) {
        throw new BackupRemoteClientError(
          'forbidden',
          'La suscripción de TPV Backup no permite subir nuevas copias.',
        );
      }

      backup = await this.backupService.createFile(this.temporaryDirectory);

      const remote: BackupRemoteUploadResult = await this.remoteService.upload(
        backup.filePath,
        backup.fileName,
      );

      this.assertUploadedBackupMatches(backup, remote);

      return remote;
    } finally {
      if (backup !== null) {
        await this.removeTemporaryBackupSafely(backup.filePath);
      }

      this.creating = false;
    }
  }

  /**
   * Comprueba que el servidor haya registrado
   * exactamente la copia que acabamos de generar.
   */
  private assertUploadedBackupMatches(
    local: BackupCreatedFile,
    remote: BackupRemoteUploadResult,
  ): void {
    if (remote.backupId === local.backupId && remote.sizeBytes === local.sizeBytes) {
      return;
    }

    throw new BackupRemoteClientError(
      'invalid-response',
      'TPV Backup ha devuelto metadatos que no corresponden con la copia enviada.',
    );
  }

  /**
   * Elimina el `.otpv` temporal sin convertir
   * una subida correcta en un error de limpieza.
   */
  private async removeTemporaryBackupSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido eliminar la copia temporal utilizada para TPV Backup:', error);
    }
  }
}
