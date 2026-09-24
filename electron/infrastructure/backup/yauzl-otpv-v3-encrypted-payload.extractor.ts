import { validateOtpvV3OuterEntries } from '@backend/application/backup/otpv-v3-package.validator';
import type OtpvV3EncryptedPayloadExtractor from '@backend/contracts/backup/otpv-v3-encrypted-payload-extractor.interface';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_MAX_PACKAGE_SIZE_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
} from '@backend/domain/backup/otpv-v3.constants';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

/**
 * Extrae payload.enc del ZIP exterior
 * mediante streaming y sin confiar en rutas.
 */
export default class YauzlOtpvV3EncryptedPayloadExtractor implements OtpvV3EncryptedPayloadExtractor {
  /**
   * Extrae payload.enc a un fichero nuevo.
   */
  async extract(packagePath: string, destinationFile: string): Promise<void> {
    await this.assertDestinationDoesNotExist(destinationFile);

    const zipFile: ZipFile = await this.openArchive(packagePath);

    let temporaryFile: string | null = null;

    try {
      const entries: readonly Entry[] = await this.readEntries(zipFile);

      validateOtpvV3OuterEntries(
        entries.map((entry: Entry): OtpvV3ArchiveEntry => this.toArchiveEntry(entry)),
      );

      const payloadEntry: Entry = this.getPayloadEntry(entries);

      /*
       * El contrato v3 exige que payload.enc
       * se almacene sin recomprimir.
       */
      if (payloadEntry.compressionMethod !== 0) {
        throw new Error('payload.enc debe almacenarse sin compresión dentro del .otpv.');
      }

      const sourceStream: Readable = await this.openEntryStream(zipFile, payloadEntry);

      await mkdir(dirname(destinationFile), {
        recursive: true,
      });

      temporaryFile = join(dirname(destinationFile), `.extract-${randomUUID()}.tmp`);

      let extractedSize: number = 0;

      const sizeValidator: Transform = new Transform({
        transform(chunk: Buffer | string, _encoding: BufferEncoding, callback): void {
          const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

          extractedSize += buffer.length;

          if (
            extractedSize > payloadEntry.uncompressedSize ||
            extractedSize > OTPV_V3_MAX_PACKAGE_SIZE_BYTES
          ) {
            callback(new Error('payload.enc supera el tamaño declarado o permitido.'));

            return;
          }

          callback(null, buffer);
        },
      });

      await pipeline(
        sourceStream,
        sizeValidator,
        createWriteStream(temporaryFile, {
          flags: 'wx',
          mode: 0o600,
        }),
      );

      if (extractedSize !== payloadEntry.uncompressedSize) {
        throw new Error('El tamaño real de payload.enc no coincide con el declarado.');
      }

      await rename(temporaryFile, destinationFile);

      temporaryFile = null;
    } finally {
      zipFile.close();

      if (temporaryFile !== null) {
        await this.removeTemporaryFileSafely(temporaryFile);
      }
    }
  }

  /**
   * Abre el contenedor exterior.
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
              new Error('No se ha podido abrir el contenedor .otpv.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('El contenedor .otpv no ha proporcionado un ZIP.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  /**
   * Lee el índice exterior permitiendo únicamente
   * las dos entradas previstas por v3.
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
            if (entries.length >= 2) {
              throw new Error(
                [
                  'El contenedor exterior debe contener',
                  'exactamente manifest.json y payload.enc.',
                ].join(' '),
              );
            }

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
            new Error('No se ha podido leer el índice del contenedor .otpv.', {
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
   * Recupera la entrada payload.enc ya validada.
   */
  private getPayloadEntry(entries: readonly Entry[]): Entry {
    const payloadEntry: Entry | undefined = entries.find(
      (entry: Entry): boolean => entry.fileName === OTPV_V3_PAYLOAD_ENTRY,
    );

    if (payloadEntry === undefined) {
      throw new Error('No se ha encontrado payload.enc.');
    }

    return payloadEntry;
  }

  /**
   * Abre el stream de una entrada ZIP.
   */
  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>(
      (resolve: (stream: Readable) => void, reject: (reason?: unknown) => void): void => {
        zipFile.openReadStream(entry, (error: Error | null, stream?: Readable): void => {
          if (error !== null) {
            reject(
              new Error(`No se ha podido abrir ${entry.fileName}.`, {
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
   * independiente de validación v3.
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
   * Detecta enlaces simbólicos mediante
   * los atributos POSIX del ZIP.
   */
  private isSymbolicLink(entry: Entry): boolean {
    const unixMode: number = (entry.externalFileAttributes >>> 16) & 0xffff;

    return (unixMode & 0o170000) === 0o120000;
  }

  /**
   * Impide sobrescribir un destino existente.
   */
  private async assertDestinationDoesNotExist(destinationFile: string): Promise<void> {
    try {
      await access(destinationFile);
    } catch {
      return;
    }

    throw new Error('El fichero de destino de payload.enc ya existe.');
  }

  /**
   * Limpia un temporal sin ocultar el error principal.
   */
  private async removeTemporaryFileSafely(temporaryFile: string): Promise<void> {
    try {
      await rm(temporaryFile, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido limpiar un payload temporal:', error);
    }
  }
}
