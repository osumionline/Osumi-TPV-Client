import { validateOtpvV3Manifest } from '@backend/application/backup/otpv-v3-contract.validator';
import {
  validateOtpvV3OuterEntries,
  validateOtpvV3PackageSize,
} from '@backend/application/backup/otpv-v3-package.validator';
import type { OtpvV3EncryptionResult } from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type {
  OtpvV3AuthenticatedMetadata,
  OtpvV3Manifest,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type {
  OtpvV3BuildPackageCommand,
  OtpvV3PackageBuilder,
  OtpvV3PackageBuildResult,
} from '@backend/contracts/backup/otpv-v3-package-builder.interface';
import type { OtpvV3PayloadBuilder } from '@backend/contracts/backup/otpv-v3-payload-builder.interface';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import serializeOtpvV3AuthenticatedMetadata from '@backend/domain/backup/otpv-v3-authenticated-metadata.serializer';
import {
  OTPV_V3_APPLICATION,
  OTPV_V3_CRYPTO_SUITE,
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_MANIFEST_ENTRY,
  OTPV_V3_PAYLOAD_ENTRY,
} from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import { randomUUID } from 'node:crypto';
import type { Stats } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ZipFile } from 'yazl';

/**
 * Construye el contenedor exterior `.otpv` v3.
 */
export default class YazlOtpvV3PackageBuilder implements OtpvV3PackageBuilder {
  /**
   * Crea el builder para una versión concreta del Client.
   */
  constructor(
    private readonly applicationVersion: string,
    private readonly payloadBuilder: OtpvV3PayloadBuilder,
  ) {
    this.assertApplicationVersion();
  }

  /**
   * Genera manifest.json, payload.enc y el ZIP exterior definitivo.
   */
  async create(command: OtpvV3BuildPackageCommand): Promise<OtpvV3PackageBuildResult> {
    this.assertBackupApiKey(command.backupApiKey);
    await this.assertDestinationDoesNotExist(command.destinationFile);

    const destinationDirectory: string = dirname(command.destinationFile);

    await mkdir(destinationDirectory, { recursive: true });

    const backupId: string = randomUUID();
    const createdAt: string = new Date().toISOString();

    const metadata: OtpvV3AuthenticatedMetadata = {
      formatVersion: OTPV_V3_FORMAT_VERSION,
      backupId,
      application: OTPV_V3_APPLICATION,
      applicationVersion: this.applicationVersion,
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
      createdAt,
      cryptoSuite: OTPV_V3_CRYPTO_SUITE,
    };

    const authenticatedData: Buffer = serializeOtpvV3AuthenticatedMetadata(metadata);

    const payloadFile: string = join(destinationDirectory, `.payload-${backupId}.enc`);
    const temporaryPackageFile: string = join(destinationDirectory, `.package-${backupId}.tmp`);

    try {
      const encryption: OtpvV3EncryptionResult = await this.payloadBuilder.create({
        backupApiKey: command.backupApiKey,
        authenticatedData,
        destinationFile: payloadFile,
      });

      const manifest: OtpvV3Manifest = {
        ...metadata,
        authenticatedData: authenticatedData.toString('base64'),
        kdf: encryption.kdf,
        keyWrap: encryption.keyWrap,
        payload: encryption.payload,
      };

      validateOtpvV3Manifest(manifest);

      const manifestBuffer: Buffer = this.serializeManifest(manifest);
      const payloadStats: Stats = await stat(payloadFile);

      this.validateOuterSources(manifestBuffer, payloadStats);

      await this.writePackage(temporaryPackageFile, manifestBuffer, payloadFile);

      const packageStats: Stats = await stat(temporaryPackageFile);

      if (!packageStats.isFile()) {
        throw new Error('El contenedor .otpv generado no es un fichero regular.');
      }

      validateOtpvV3PackageSize(packageStats.size);

      await rename(temporaryPackageFile, command.destinationFile);

      return {
        manifest,
        destinationFile: command.destinationFile,
        sizeBytes: packageStats.size,
      };
    } catch (error: unknown) {
      throw new Error('No se ha podido generar la copia de seguridad .otpv.', { cause: error });
    } finally {
      await this.removeTemporaryFileSafely(payloadFile);
      await this.removeTemporaryFileSafely(temporaryPackageFile);
    }
  }

  /**
   * Serializa manifest.json como JSON UTF-8 legible.
   */
  private serializeManifest(manifest: OtpvV3Manifest): Buffer {
    return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  /**
   * Valida las dos entradas que formarán
   * el ZIP exterior antes de escribirlo.
   */
  private validateOuterSources(manifestBuffer: Buffer, payloadStats: Stats): void {
    if (!payloadStats.isFile()) {
      throw new Error('payload.enc no es un fichero regular.');
    }

    const entries: readonly OtpvV3ArchiveEntry[] = [
      {
        path: OTPV_V3_MANIFEST_ENTRY,
        uncompressedSize: manifestBuffer.length,
        isDirectory: false,
        isSymbolicLink: false,
      },
      {
        path: OTPV_V3_PAYLOAD_ENTRY,
        uncompressedSize: payloadStats.size,
        isDirectory: false,
        isSymbolicLink: false,
      },
    ];

    validateOtpvV3OuterEntries(entries);
  }

  /**
   * Escribe el ZIP exterior con manifest.json
   * y payload.enc sin recomprimir el payload cifrado.
   */
  private async writePackage(
    destinationFile: string,
    manifestBuffer: Buffer,
    payloadFile: string,
  ): Promise<void> {
    const zipFile: ZipFile = new ZipFile();

    zipFile.addBuffer(manifestBuffer, OTPV_V3_MANIFEST_ENTRY);
    zipFile.addFile(payloadFile, OTPV_V3_PAYLOAD_ENTRY, { compress: false });

    const writePromise: Promise<void> = pipeline(
      zipFile.outputStream,
      createWriteStream(destinationFile, { flags: 'wx', mode: 0o600 }),
    );

    zipFile.end();

    await writePromise;
  }

  /**
   * Comprueba que la versión de aplicación
   * pueda formar parte del manifest.
   */
  private assertApplicationVersion(): void {
    if (this.applicationVersion.trim().length === 0) {
      throw new Error('La versión de la aplicación no puede estar vacía.');
    }
  }

  /**
   * Comprueba que exista una TPV Backup key.
   */
  private assertBackupApiKey(backupApiKey: string): void {
    if (backupApiKey.length === 0) {
      throw new Error('La TPV Backup key no puede estar vacía.');
    }
  }

  /**
   * Evita sobrescribir una copia ya existente.
   */
  private async assertDestinationDoesNotExist(destinationFile: string): Promise<void> {
    try {
      await access(destinationFile);
    } catch {
      return;
    }

    throw new Error('El fichero .otpv de destino ya existe.');
  }

  /**
   * Elimina un temporal sin ocultar
   * el error principal de generación.
   */
  private async removeTemporaryFileSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, { force: true });
    } catch (cleanupError: unknown) {
      console.error('No se ha podido limpiar un temporal del backup:', cleanupError);
    }
  }
}
