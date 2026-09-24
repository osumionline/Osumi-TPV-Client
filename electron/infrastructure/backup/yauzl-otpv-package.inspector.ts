import {
  assertOtpvV3ManifestCompatible,
  validateOtpvV3Manifest,
} from '@backend/application/backup/otpv-v3-contract.validator';
import {
  validateOtpvV3OuterEntries,
  validateOtpvV3PackageSize,
} from '@backend/application/backup/otpv-v3-package.validator';
import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_MANIFEST_ENTRY,
  OTPV_V3_MAX_PACKAGE_SIZE_BYTES,
} from '@backend/domain/backup/otpv-v3.constants';
import {
  LEGACY_IMPORT_MAX_ENTRY_COUNT,
  LEGACY_IMPORT_MAX_JSON_SIZE,
  LEGACY_IMPORT_MAX_PACKAGE_SIZE,
  LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
} from '@backend/domain/legacy-import/legacy-import.constants';
import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

/**
 * Inspecciona la envoltura inicial de un `.otpv`
 * y distingue los formatos legacy v2 y nativo v3.
 */
export default class YauzlOtpvPackageInspector implements OtpvPackageInspector {
  /**
   * Identifica la versión del paquete.
   *
   * Un v2 únicamente se clasifica para que después
   * lo procese el inspector legacy existente.
   *
   * Un v3 valida además su contenedor exterior,
   * manifest y compatibilidad.
   */
  async inspect(packagePath: string): Promise<OtpvPackageInspection> {
    const packageStats: Stats = await stat(packagePath);

    this.assertPackageFile(packagePath, packageStats);

    const zipFile: ZipFile = await this.openArchive(packagePath);

    try {
      const entries: readonly Entry[] = await this.readEntries(zipFile);

      const manifestEntry: Entry = this.findManifestEntry(entries);

      const manifestValue: unknown = await this.readManifest(zipFile, manifestEntry);

      const formatVersion: number = this.readFormatVersion(manifestValue);

      if (formatVersion === LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION) {
        if (packageStats.size > LEGACY_IMPORT_MAX_PACKAGE_SIZE) {
          throw new Error('El paquete legacy supera el tamaño máximo permitido.');
        }

        return {
          formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
          manifest: null,
        };
      }

      if (formatVersion === OTPV_V3_FORMAT_VERSION) {
        validateOtpvV3PackageSize(packageStats.size);

        const archiveEntries: readonly OtpvV3ArchiveEntry[] = entries.map(
          (entry: Entry): OtpvV3ArchiveEntry => this.toArchiveEntry(entry),
        );

        validateOtpvV3OuterEntries(archiveEntries);

        const manifest: OtpvV3Manifest = validateOtpvV3Manifest(manifestValue);

        assertOtpvV3ManifestCompatible(manifest);

        return {
          formatVersion: OTPV_V3_FORMAT_VERSION,
          manifest,
        };
      }

      throw new Error(`Versión de formato .otpv no soportada: ${formatVersion}.`);
    } finally {
      zipFile.close();
    }
  }

  /**
   * Comprueba los requisitos físicos mínimos
   * antes de abrir el contenedor ZIP.
   */
  private assertPackageFile(packagePath: string, packageStats: Stats): void {
    if (!packageStats.isFile()) {
      throw new Error('El paquete seleccionado no es un archivo.');
    }

    if (extname(packagePath).toLowerCase() !== '.otpv') {
      throw new Error('El archivo seleccionado no tiene la extensión .otpv.');
    }

    if (packageStats.size === 0) {
      throw new Error('El paquete seleccionado está vacío.');
    }

    /*
     * Antes de leer manifest.json todavía no sabemos
     * si estamos ante v2 o v3. Utilizamos aquí el mayor
     * límite admitido y aplicamos después el específico
     * de cada formato.
     */
    if (packageStats.size > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
      throw new Error('El paquete seleccionado supera el tamaño máximo permitido.');
    }
  }

  /**
   * Abre el `.otpv` como ZIP sin cerrarlo
   * automáticamente al terminar de leer su índice.
   */
  private openArchive(packagePath: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>(
      (resolve: (zipFile: ZipFile) => void, reject: (reason?: unknown) => void): void => {
        open(packagePath, options, (error: Error | null, zipFile?: ZipFile): void => {
          if (error !== null) {
            reject(
              new Error('El archivo seleccionado no es un ZIP válido.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('No se ha podido abrir el paquete .otpv.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  /**
   * Lee el índice completo del ZIP aplicando
   * un límite previo independiente del formato.
   */
  private readEntries(zipFile: ZipFile): Promise<readonly Entry[]> {
    return new Promise<readonly Entry[]>(
      (resolve: (entries: readonly Entry[]) => void, reject: (reason?: unknown) => void): void => {
        const entries: Entry[] = [];

        const cleanup = (): void => {
          zipFile.removeListener('entry', onEntry);
          zipFile.removeListener('end', onEnd);
          zipFile.removeListener('error', onError);
        };

        const onError = (error: Error): void => {
          cleanup();

          reject(
            new Error('No se ha podido leer el índice del paquete.', {
              cause: error,
            }),
          );
        };

        const onEnd = (): void => {
          cleanup();

          resolve(entries);
        };

        const onEntry = (entry: Entry): void => {
          try {
            if (entries.length >= LEGACY_IMPORT_MAX_ENTRY_COUNT) {
              throw new Error('El paquete contiene demasiadas entradas.');
            }

            if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
              throw new Error(
                [
                  'El paquete contiene una entrada ZIP',
                  'cifrada que no puede procesarse:',
                  entry.fileName,
                ].join(' '),
              );
            }

            entries.push(entry);

            zipFile.readEntry();
          } catch (error: unknown) {
            cleanup();

            reject(error);
          }
        };

        zipFile.on('entry', onEntry);
        zipFile.once('end', onEnd);
        zipFile.once('error', onError);

        zipFile.readEntry();
      },
    );
  }

  /**
   * Localiza una única entrada regular manifest.json.
   */
  private findManifestEntry(entries: readonly Entry[]): Entry {
    const manifests: readonly Entry[] = entries.filter(
      (entry: Entry): boolean =>
        entry.fileName === OTPV_V3_MANIFEST_ENTRY && !entry.fileName.endsWith('/'),
    );

    if (manifests.length === 0) {
      throw new Error('El paquete no contiene manifest.json.');
    }

    if (manifests.length > 1) {
      throw new Error('El paquete contiene varias entradas manifest.json.');
    }

    const manifest: Entry | undefined = manifests[0];

    if (manifest === undefined) {
      throw new Error('No se ha podido localizar manifest.json.');
    }

    return manifest;
  }

  /**
   * Lee y parsea manifest.json usando un límite
   * suficientemente amplio para detectar primero
   * tanto paquetes v2 como v3.
   */
  private async readManifest(zipFile: ZipFile, entry: Entry): Promise<unknown> {
    if (entry.uncompressedSize > LEGACY_IMPORT_MAX_JSON_SIZE) {
      throw new Error('manifest.json supera el tamaño máximo de inspección permitido.');
    }

    const content: Buffer = await this.readEntryBuffer(zipFile, entry, LEGACY_IMPORT_MAX_JSON_SIZE);

    try {
      return JSON.parse(content.toString('utf8')) as unknown;
    } catch (error: unknown) {
      throw new Error('manifest.json no contiene un JSON válido.', {
        cause: error,
      });
    }
  }

  /**
   * Lee una entrada controlando también el tamaño
   * real recibido desde el stream.
   */
  private readEntryBuffer(zipFile: ZipFile, entry: Entry, maximumSize: number): Promise<Buffer> {
    return new Promise<Buffer>(
      (resolve: (buffer: Buffer) => void, reject: (reason?: unknown) => void): void => {
        zipFile.openReadStream(entry, (error: Error | null, readStream?: Readable): void => {
          if (error !== null) {
            reject(error);

            return;
          }

          if (readStream === undefined) {
            reject(new Error(`No se ha podido leer ${entry.fileName}.`));

            return;
          }

          const chunks: Buffer[] = [];
          let currentSize: number = 0;

          readStream.on('data', (chunk: Buffer | string): void => {
            const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

            currentSize += buffer.length;

            if (currentSize > maximumSize) {
              readStream.destroy(new Error(`${entry.fileName} supera el tamaño permitido.`));

              return;
            }

            chunks.push(buffer);
          });

          readStream.once('error', (streamError: Error): void => {
            reject(streamError);
          });

          readStream.once('end', (): void => {
            resolve(Buffer.concat(chunks));
          });
        });
      },
    );
  }

  /**
   * Obtiene únicamente formatVersion antes de
   * seleccionar el validador específico.
   */
  private readFormatVersion(manifest: unknown): number {
    if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
      throw new Error('manifest.json no contiene un objeto válido.');
    }

    const formatVersion: unknown = (manifest as Record<string, unknown>)['formatVersion'];

    if (
      typeof formatVersion !== 'number' ||
      !Number.isSafeInteger(formatVersion) ||
      formatVersion <= 0
    ) {
      throw new Error('manifest.json no contiene un formatVersion válido.');
    }

    return formatVersion;
  }

  /**
   * Traduce una entrada de yauzl al contrato
   * independiente utilizado por los validadores v3.
   */
  private toArchiveEntry(entry: Entry): OtpvV3ArchiveEntry {
    return {
      path: entry.fileName,
      uncompressedSize: entry.uncompressedSize,
      isDirectory: entry.fileName.endsWith('/'),
      isSymbolicLink: this.isSymbolicLink(entry),
    };
  }

  /**
   * Detecta enlaces simbólicos a partir de los bits
   * POSIX almacenados en los atributos externos ZIP.
   */
  private isSymbolicLink(entry: Entry): boolean {
    const unixMode: number = (entry.externalFileAttributes >>> 16) & 0xffff;
    const fileType: number = unixMode & 0o170000;

    return fileType === 0o120000;
  }
}
