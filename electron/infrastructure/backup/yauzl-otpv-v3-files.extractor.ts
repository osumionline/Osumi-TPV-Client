import { validateOtpvV3PayloadEntries } from '@backend/application/backup/otpv-v3-package.validator';
import type OtpvV3FilesExtractor from '@backend/contracts/backup/otpv-v3-files-extractor.interface';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_FILES_PREFIX,
  OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
} from '@backend/domain/backup/otpv-v3.constants';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

/**
 * Materializa la jerarquía files/**
 * del payload portable v3.
 */
export default class YauzlOtpvV3FilesExtractor implements OtpvV3FilesExtractor {
  /**
   * Extrae todos los ficheros pertenecientes
   * a la raíz lógica files/.
   */
  async extract(payloadFile: string, destinationDirectory: string): Promise<void> {
    await rm(destinationDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(destinationDirectory, {
      recursive: true,
    });

    const zipFile: ZipFile = await this.openArchive(payloadFile);

    try {
      const entries: readonly Entry[] = await this.readEntries(zipFile);

      const archiveEntries: readonly OtpvV3ArchiveEntry[] = entries.map(
        (entry: Entry): OtpvV3ArchiveEntry => this.toArchiveEntry(entry),
      );

      /*
       * Aunque el inspector ya realizó esta
       * validación, volvemos a aplicarla antes
       * de materializar rutas físicas.
       */
      validateOtpvV3PayloadEntries(archiveEntries);

      for (const entry of entries) {
        if (entry.fileName.endsWith('/') || !entry.fileName.startsWith(OTPV_V3_FILES_PREFIX)) {
          continue;
        }

        await this.extractEntry(zipFile, entry, destinationDirectory);
      }
    } catch (error: unknown) {
      await this.cleanDestinationSafely(destinationDirectory);

      throw error;
    } finally {
      zipFile.close();
    }
  }

  /**
   * Abre el ZIP interior ya descifrado.
   */
  private openArchive(payloadFile: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>(
      (resolve: (zipFile: ZipFile) => void, reject: (reason?: unknown) => void): void => {
        open(payloadFile, options, (error: Error | null, zipFile?: ZipFile): void => {
          if (error !== null) {
            reject(
              new Error('No se ha podido abrir el ZIP interior para restaurar files/**.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('No se ha obtenido el ZIP interior para restaurar files/**.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  /**
   * Lee el índice completo antes de comenzar
   * a materializar recursos.
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

        const onEntry = (entry: Entry): void => {
          try {
            if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
              throw new Error(`La entrada ${entry.fileName} utiliza cifrado ZIP no admitido.`);
            }

            entries.push(entry);

            zipFile.readEntry();
          } catch (error: unknown) {
            cleanup();

            reject(error);
          }
        };

        const onEnd = (): void => {
          cleanup();

          resolve(entries);
        };

        const onError = (error: Error): void => {
          cleanup();

          reject(
            new Error('No se ha podido leer el índice del ZIP interior.', {
              cause: error,
            }),
          );
        };

        zipFile.on('entry', onEntry);

        zipFile.once('end', onEnd);

        zipFile.once('error', onError);

        zipFile.readEntry();
      },
    );
  }

  /**
   * Extrae una entrada files/** conservando
   * su jerarquía relativa.
   */
  private async extractEntry(
    zipFile: ZipFile,
    entry: Entry,
    destinationDirectory: string,
  ): Promise<void> {
    const destinationFile: string = this.resolveDestinationFile(
      destinationDirectory,
      entry.fileName,
    );

    await mkdir(dirname(destinationFile), {
      recursive: true,
    });

    const temporaryFile: string = resolve(dirname(destinationFile), `.restore-${randomUUID()}.tmp`);

    const stream: Readable = await this.openEntryStream(zipFile, entry);

    let actualSize: number = 0;

    const sizeValidator: Transform = new Transform({
      transform(chunk: Buffer | string, _encoding: BufferEncoding, callback): void {
        const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        actualSize += buffer.length;

        if (
          actualSize > entry.uncompressedSize ||
          actualSize > OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES
        ) {
          callback(new Error(`La entrada ${entry.fileName} supera el tamaño permitido.`));

          return;
        }

        callback(null, buffer);
      },
    });

    try {
      await pipeline(
        stream,
        sizeValidator,
        createWriteStream(temporaryFile, {
          flags: 'wx',
          mode: 0o600,
        }),
      );

      if (actualSize !== entry.uncompressedSize) {
        throw new Error(`El tamaño real de ${entry.fileName} no coincide con el declarado.`);
      }

      await rename(temporaryFile, destinationFile);
    } catch (error: unknown) {
      await rm(temporaryFile, {
        force: true,
      });

      throw error;
    }
  }

  /**
   * Resuelve una ruta files/** dentro de la
   * carpeta física del workspace.
   */
  private resolveDestinationFile(destinationDirectory: string, archivePath: string): string {
    const relativePath: string = archivePath.slice(OTPV_V3_FILES_PREFIX.length);

    if (relativePath.length === 0 || relativePath.endsWith('/')) {
      throw new Error(`La ruta ${archivePath} no representa un fichero restaurable.`);
    }

    const rootDirectory: string = resolve(destinationDirectory);

    const destinationFile: string = resolve(rootDirectory, ...relativePath.split('/'));

    const rootPrefix: string = `${rootDirectory}${sep}`;

    if (destinationFile === rootDirectory || !destinationFile.startsWith(rootPrefix)) {
      throw new Error(`La ruta ${archivePath} escapa del workspace de restauración.`);
    }

    return destinationFile;
  }

  /**
   * Abre el contenido descomprimido
   * de una entrada del ZIP.
   */
  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>(
      (resolve: (stream: Readable) => void, reject: (reason?: unknown) => void): void => {
        zipFile.openReadStream(entry, (error: Error | null, stream?: Readable): void => {
          if (error !== null) {
            reject(
              new Error(`No se ha podido leer ${entry.fileName}.`, {
                cause: error,
              }),
            );

            return;
          }

          if (stream === undefined) {
            reject(new Error(`No se ha obtenido el contenido de ${entry.fileName}.`));

            return;
          }

          resolve(stream);
        });
      },
    );
  }

  /**
   * Traduce una entrada yauzl al contrato
   * común de validación v3.
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
   * Detecta enlaces simbólicos almacenados
   * mediante atributos POSIX.
   */
  private isSymbolicLink(entry: Entry): boolean {
    const unixMode: number = (entry.externalFileAttributes >>> 16) & 0xffff;

    return (unixMode & 0o170000) === 0o120000;
  }

  /**
   * Limpia una extracción incompleta sin
   * ocultar el error original.
   */
  private async cleanDestinationSafely(destinationDirectory: string): Promise<void> {
    try {
      await rm(destinationDirectory, {
        recursive: true,
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se han podido limpiar los files/** temporales:', error);
    }
  }
}
