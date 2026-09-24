import type OtpvV3RequiredContentExtractor from '@backend/contracts/backup/otpv-v3-required-content-extractor.interface';
import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';
import {
  OTPV_V3_APP_DATA_ENTRY,
  OTPV_V3_DATABASE_ENTRY,
  OTPV_V3_LOGO_ENTRY,
  OTPV_V3_MAX_APP_DATA_SIZE_BYTES,
  OTPV_V3_MAX_LOGO_SIZE_BYTES,
  OTPV_V3_MAX_PORTABLE_SECRETS_SIZE_BYTES,
  OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
  OTPV_V3_SECRETS_ENTRY,
} from '@backend/domain/backup/otpv-v3.constants';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

interface RequiredEntryDefinition {
  readonly archivePath: string;
  readonly destinationFile: string;
  readonly maximumSize: number;
}

/**
 * Extrae únicamente los cuatro recursos obligatorios
 * del ZIP interior de una copia v3.
 */
export default class YauzlOtpvV3RequiredContentExtractor implements OtpvV3RequiredContentExtractor {
  /**
   * Materializa los recursos obligatorios
   * dentro del workspace de restauración.
   */
  async extract(payloadFile: string, destinations: OtpvV3RequiredContentPaths): Promise<void> {
    const zipFile: ZipFile = await this.openArchive(payloadFile);

    try {
      const entries: ReadonlyMap<string, Entry> = await this.readEntryMap(zipFile);

      const definitions: readonly RequiredEntryDefinition[] = [
        {
          archivePath: OTPV_V3_DATABASE_ENTRY,
          destinationFile: destinations.databaseFile,
          maximumSize: OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
        },
        {
          archivePath: OTPV_V3_APP_DATA_ENTRY,
          destinationFile: destinations.appDataFile,
          maximumSize: OTPV_V3_MAX_APP_DATA_SIZE_BYTES,
        },
        {
          archivePath: OTPV_V3_LOGO_ENTRY,
          destinationFile: destinations.logoFile,
          maximumSize: OTPV_V3_MAX_LOGO_SIZE_BYTES,
        },
        {
          archivePath: OTPV_V3_SECRETS_ENTRY,
          destinationFile: destinations.portableSecretsFile,
          maximumSize: OTPV_V3_MAX_PORTABLE_SECRETS_SIZE_BYTES,
        },
      ];

      for (const definition of definitions) {
        const entry: Entry | undefined = entries.get(definition.archivePath);

        if (entry === undefined) {
          throw new Error(`Falta el archivo obligatorio ${definition.archivePath}.`);
        }

        await this.extractEntry(zipFile, entry, definition.destinationFile, definition.maximumSize);
      }
    } finally {
      zipFile.close();
    }
  }

  /**
   * Abre el ZIP interior.
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
              new Error('No se ha podido abrir el ZIP interior para extraer sus recursos.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('No se ha obtenido el ZIP interior de la copia.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  /**
   * Construye el índice de entradas regulares
   * y rechaza duplicados.
   */
  private readEntryMap(zipFile: ZipFile): Promise<ReadonlyMap<string, Entry>> {
    return new Promise<ReadonlyMap<string, Entry>>(
      (
        resolve: (entries: ReadonlyMap<string, Entry>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const entries: Map<string, Entry> = new Map<string, Entry>();

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

            if (!entry.fileName.endsWith('/')) {
              if (entries.has(entry.fileName)) {
                throw new Error(`El payload contiene una entrada duplicada: ${entry.fileName}`);
              }

              entries.set(entry.fileName, entry);
            }

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
            new Error('No se ha podido leer el ZIP interior.', {
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
   * Extrae una entrada mediante streaming,
   * verificando también su tamaño real.
   */
  private async extractEntry(
    zipFile: ZipFile,
    entry: Entry,
    destinationFile: string,
    maximumSize: number,
  ): Promise<void> {
    if (entry.uncompressedSize === 0 || entry.uncompressedSize > maximumSize) {
      throw new Error(`La entrada ${entry.fileName} tiene un tamaño no permitido.`);
    }

    const stream: Readable = await this.openEntryStream(zipFile, entry);

    await mkdir(dirname(destinationFile), {
      recursive: true,
    });

    const temporaryFile: string = join(dirname(destinationFile), `.restore-${randomUUID()}.tmp`);

    let actualSize: number = 0;

    const sizeValidator: Transform = new Transform({
      transform(chunk: Buffer | string, _encoding: BufferEncoding, callback): void {
        const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        actualSize += buffer.length;

        if (actualSize > entry.uncompressedSize || actualSize > maximumSize) {
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
   * Abre una entrada del ZIP interior.
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
}
