import { validateOtpvV3PayloadEntries } from '@backend/application/backup/otpv-v3-package.validator';
import type DatabaseSnapshot from '@backend/contracts/backup/database-snapshot.interface';
import type {
  OtpvV3Crypto,
  OtpvV3EncryptionResult,
} from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type {
  OtpvV3BuildPayloadCommand,
  OtpvV3PayloadBuilder,
} from '@backend/contracts/backup/otpv-v3-payload-builder.interface';
import type OtpvV3PortableSecrets from '@backend/contracts/backup/otpv-v3-portable-secrets.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_APP_DATA_ENTRY,
  OTPV_V3_DATABASE_ENTRY,
  OTPV_V3_FILES_PREFIX,
  OTPV_V3_LOGO_ENTRY,
  OTPV_V3_PORTABLE_SECRETS_SCHEMA_VERSION,
  OTPV_V3_SECRETS_ENTRY,
} from '@backend/domain/backup/otpv-v3.constants';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { randomUUID } from 'node:crypto';
import type { Dirent, Stats } from 'node:fs';
import { access, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { ZipFile } from 'yazl';

interface PayloadFileSource {
  readonly kind: 'file';
  readonly archivePath: string;
  readonly sourceFile: string;
  readonly uncompressedSize: number;
}

interface PayloadBufferSource {
  readonly kind: 'buffer';
  readonly archivePath: string;
  readonly content: Buffer;
  readonly uncompressedSize: number;
}

type PayloadSource = PayloadFileSource | PayloadBufferSource;

/**
 * Construye el ZIP interior de `.otpv` v3
 * y lo cifra directamente sin materializarlo en claro.
 */
export default class YazlOtpvV3PayloadBuilder implements OtpvV3PayloadBuilder {
  /**
   * Crea el builder con las dependencias
   * necesarias para obtener el estado portable.
   */
  constructor(
    private readonly paths: ApplicationPaths,
    private readonly databaseSnapshot: DatabaseSnapshot,
    private readonly appDataRepository: AppDataRepository,
    private readonly secretStorage: SecretStorage,
    private readonly crypto: OtpvV3Crypto,
  ) {}

  /**
   * Construye y cifra el payload de una copia v3.
   */
  async create(command: OtpvV3BuildPayloadCommand): Promise<OtpvV3EncryptionResult> {
    await this.assertDestinationDoesNotExist(command.destinationFile);

    const appData: AppData = await this.loadRequiredAppData();
    const secrets: InstallationSecretsData = await this.loadRequiredSecrets();
    const destinationDirectory: string = dirname(command.destinationFile);

    await mkdir(destinationDirectory, {
      recursive: true,
    });

    const snapshotFile: string = join(
      destinationDirectory,
      ['.', basename(command.destinationFile), '.', randomUUID(), '.snapshot.sqlite'].join(''),
    );

    let portableSecretsBuffer: Buffer | null = null;

    try {
      await this.databaseSnapshot.create(snapshotFile);

      const appDataBuffer: Buffer = this.serializeJson(appData);

      portableSecretsBuffer = this.serializePortableSecrets(secrets);

      const sources: readonly PayloadSource[] = [
        await this.createFileSource(snapshotFile, OTPV_V3_DATABASE_ENTRY),

        this.createBufferSource(appDataBuffer, OTPV_V3_APP_DATA_ENTRY),

        await this.createFileSource(this.paths.logoFile, OTPV_V3_LOGO_ENTRY),

        this.createBufferSource(portableSecretsBuffer, OTPV_V3_SECRETS_ENTRY),

        ...(await this.collectFiles(this.paths.filesDirectory, OTPV_V3_FILES_PREFIX, true)),
      ];

      this.validateSources(sources);

      const zipFile: ZipFile = this.createZipFile(sources);
      const zipStream: Readable = zipFile.outputStream as Readable;

      zipFile.once(
        'error',

        (error: Error): void => {
          zipStream.destroy(error);
        },
      );

      const encryptionPromise: Promise<OtpvV3EncryptionResult> = this.crypto.encryptStream({
        backupApiKey: command.backupApiKey,
        authenticatedData: command.authenticatedData,
        sourceStream: zipStream,
        destinationFile: command.destinationFile,
      });

      zipFile.end();

      return await encryptionPromise;
    } finally {
      if (portableSecretsBuffer !== null) {
        portableSecretsBuffer.fill(0);
      }

      await this.removeSnapshotSafely(snapshotFile);
    }
  }

  /**
   * Recupera app_data.json y exige
   * que la instalación esté configurada.
   */
  private async loadRequiredAppData(): Promise<AppData> {
    const appData: AppData | null = await this.appDataRepository.load();

    if (appData === null) {
      throw new Error('No se ha encontrado app_data.json para crear la copia.');
    }

    return appData;
  }

  /**
   * Recupera los secretos lógicos de la instalación
   * sin utilizar el fichero cifrado de safeStorage.
   */
  private async loadRequiredSecrets(): Promise<InstallationSecretsData> {
    const secrets: InstallationSecretsData | null = await this.secretStorage.load();

    if (secrets === null) {
      throw new Error('No se han encontrado los secretos de la instalación.');
    }

    if (secrets.backupApiKey.length === 0) {
      throw new Error('La instalación no contiene una TPV Backup key válida.');
    }

    return secrets;
  }

  /**
   * Serializa un documento JSON portable
   * utilizando UTF-8 y salto final.
   */
  private serializeJson(value: unknown): Buffer {
    return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }

  /**
   * Construye el documento portable de secretos
   * que solo existirá dentro del stream ZIP cifrado.
   */
  private serializePortableSecrets(secrets: InstallationSecretsData): Buffer {
    const portableSecrets: OtpvV3PortableSecrets = {
      schemaVersion: OTPV_V3_PORTABLE_SECRETS_SCHEMA_VERSION,
      secretApi: secrets.secretApi,
      backupApiKey: secrets.backupApiKey,
      emailSmtpPass: secrets.emailSmtpPass,
      ticketBaiToken: secrets.ticketBaiToken,
    };

    return this.serializeJson(portableSecrets);
  }

  /**
   * Construye una fuente ZIP respaldada
   * por un fichero regular del filesystem.
   */
  private async createFileSource(
    sourceFile: string,
    archivePath: string,
  ): Promise<PayloadFileSource> {
    const fileStats: Stats = await lstat(sourceFile);

    if (fileStats.isSymbolicLink()) {
      throw new Error(`No se admiten enlaces simbólicos en el backup: ${sourceFile}`);
    }

    if (!fileStats.isFile()) {
      throw new Error(`El recurso del backup no es un fichero regular: ${sourceFile}`);
    }

    return {
      kind: 'file',
      archivePath,
      sourceFile,
      uncompressedSize: fileStats.size,
    };
  }

  /**
   * Construye una fuente ZIP residente
   * exclusivamente en memoria.
   */
  private createBufferSource(content: Buffer, archivePath: string): PayloadBufferSource {
    return {
      kind: 'buffer',
      archivePath,
      content,
      uncompressedSize: content.length,
    };
  }

  /**
   * Recorre recursivamente assets/files
   * conservando su jerarquía relativa.
   */
  private async collectFiles(
    directory: string,
    archivePrefix: string,
    optionalDirectory: boolean,
  ): Promise<readonly PayloadFileSource[]> {
    let entries: Dirent[];

    try {
      entries = await readdir(directory, {
        withFileTypes: true,
      });
    } catch (error: unknown) {
      if (optionalDirectory && this.isFileNotFoundError(error)) {
        return [];
      }

      throw error;
    }

    entries.sort((left: Dirent, right: Dirent): number => left.name.localeCompare(right.name));

    const result: PayloadFileSource[] = [];

    for (const entry of entries) {
      const sourcePath: string = join(directory, entry.name);

      const archivePath: string = `${archivePrefix}${entry.name}`;

      if (entry.isSymbolicLink()) {
        throw new Error(`No se admiten enlaces simbólicos en el backup: ${sourcePath}`);
      }

      if (entry.isDirectory()) {
        result.push(...(await this.collectFiles(sourcePath, `${archivePath}/`, false)));

        continue;
      }

      if (!entry.isFile()) {
        throw new Error(`El backup contiene un recurso no soportado: ${sourcePath}`);
      }

      result.push(await this.createFileSource(sourcePath, archivePath));
    }

    return result;
  }

  /**
   * Valida el inventario completo antes
   * de comenzar a generar el ZIP.
   */
  private validateSources(sources: readonly PayloadSource[]): void {
    const entries: OtpvV3ArchiveEntry[] = sources.map(
      (source: PayloadSource): OtpvV3ArchiveEntry => ({
        path: source.archivePath,
        uncompressedSize: source.uncompressedSize,
        isDirectory: false,
        isSymbolicLink: false,
      }),
    );

    validateOtpvV3PayloadEntries(entries);
  }

  /**
   * Construye el ZIP interior manteniendo
   * los ficheros grandes fuera de memoria.
   */
  private createZipFile(sources: readonly PayloadSource[]): ZipFile {
    const zipFile: ZipFile = new ZipFile();

    for (const source of sources) {
      if (source.kind === 'file') {
        zipFile.addFile(source.sourceFile, source.archivePath);

        continue;
      }

      zipFile.addBuffer(source.content, source.archivePath);
    }

    return zipFile;
  }

  /**
   * Evita realizar el trabajo de snapshot
   * si el payload de destino ya existe.
   */
  private async assertDestinationDoesNotExist(destinationFile: string): Promise<void> {
    try {
      await access(destinationFile);
    } catch {
      return;
    }

    throw new Error('El fichero payload.enc de destino ya existe.');
  }

  /**
   * Identifica un error ENOENT
   * sin depender del tipo concreto del filesystem.
   */
  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  }

  /**
   * Elimina el snapshot temporal incluso
   * cuando la construcción del payload falla.
   */
  private async removeSnapshotSafely(snapshotFile: string): Promise<void> {
    try {
      await rm(snapshotFile, {
        force: true,
      });
    } catch (cleanupError: unknown) {
      console.error('No se ha podido limpiar el snapshot SQLite temporal:', cleanupError);
    }
  }
}
