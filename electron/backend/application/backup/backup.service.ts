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
    const backupApiKey: string = await this.loadBackupApiKey();
    const destinationFile: string = join(this.backupsDirectory, this.createFileName());

    const result: OtpvV3PackageBuildResult = await this.packageBuilder.create({
      backupApiKey,
      destinationFile,
    });

    return {
      backupId: result.manifest.backupId,
      createdAt: result.manifest.createdAt,
      fileName: basename(result.destinationFile),
      sizeBytes: result.sizeBytes,
    };
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
