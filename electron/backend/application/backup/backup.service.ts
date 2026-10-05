import type BackupCreatedFile from '@backend/contracts/backup/backup-created-file.interface';
import type {
  OtpvV3PackageBuilder,
  OtpvV3PackageBuildResult,
} from '@backend/contracts/backup/otpv-v3-package-builder.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';

/**
 * Crea el servicio de copias locales.
 */
export default class BackupService {
  private creating: boolean = false;

  constructor(
    private readonly backupsDirectory: string,
    private readonly secretStorage: SecretStorage,
    private readonly packageBuilder: OtpvV3PackageBuilder,
  ) {}

  /**
   * Crea una copia `.otpv` completa dentro
   * del directorio local de backups.
   */
  async createLocal(): Promise<BackupCreateResult> {
    const backup: BackupCreatedFile = await this.createFile(this.backupsDirectory);

    return {
      backupId: backup.backupId,
      createdAt: backup.createdAt,
      fileName: backup.fileName,
      sizeBytes: backup.sizeBytes,
    };
  }

  /**
   * Crea una copia `.otpv` en un directorio interno
   * indicado por la capa de aplicación.
   *
   * La ruta completa nunca debe exponerse al Renderer.
   */
  async createFile(destinationDirectory: string): Promise<BackupCreatedFile> {
    if (this.creating) {
      throw new Error('Ya se está creando una copia de seguridad.');
    }

    this.creating = true;

    try {
      const backupApiKey: string = await this.loadBackupApiKey();

      const destinationFile: string = join(destinationDirectory, this.createFileName());

      const result: OtpvV3PackageBuildResult = await this.packageBuilder.create({
        backupApiKey,
        destinationFile,
      });

      return {
        backupId: result.manifest.backupId,
        createdAt: result.manifest.createdAt,
        fileName: basename(result.destinationFile),
        filePath: result.destinationFile,
        sizeBytes: result.sizeBytes,
      };
    } finally {
      this.creating = false;
    }
  }

  /**
   * Recupera la TPV Backup key necesaria
   * para cifrar la copia.
   */
  private async loadBackupApiKey(): Promise<string> {
    const secrets: InstallationSecretsData | null = await this.secretStorage.load();

    if (secrets === null || secrets.backupApiKey.length === 0) {
      throw new Error('La instalación no tiene configurada una TPV Backup key.');
    }

    return secrets.backupApiKey;
  }

  /**
   * Genera un nombre único y legible
   * para la copia local.
   */
  private createFileName(): string {
    const timestamp: string = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

    return `osumi-tpv-backup-${timestamp}-${randomUUID()}.otpv`;
  }
}
