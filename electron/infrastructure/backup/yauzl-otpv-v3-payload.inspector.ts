import { validateOtpvV3PayloadEntries } from '@backend/application/backup/otpv-v3-package.validator';
import type OtpvV3PayloadInspector from '@backend/contracts/backup/otpv-v3-payload-inspector.interface';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import type OtpvV3PayloadInspection from '@backend/domain/backup/otpv-v3-payload-inspection.interface';
import {
  OTPV_V3_MAX_PACKAGE_SIZE_BYTES,
  OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT,
  OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
  OTPV_V3_MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES,
} from '@backend/domain/backup/otpv-v3.constants';
import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

/**
 * Inspecciona el ZIP interior de una copia v3
 * sin extraer todavía ningún recurso.
 */
export default class YauzlOtpvV3PayloadInspector implements OtpvV3PayloadInspector {
  /**
   * Valida estructura, rutas, límites declarados
   * y tamaños reales de todos los streams.
   */
  async inspect(payloadFile: string): Promise<OtpvV3PayloadInspection> {
    const payloadStats: Stats = await stat(payloadFile);

    this.assertPayloadFile(payloadStats);

    const zipFile: ZipFile = await this.openArchive(payloadFile);

    try {
      const entries: readonly Entry[] = await this.readEntries(zipFile);

      const archiveEntries: readonly OtpvV3ArchiveEntry[] = entries.map(
        (entry: Entry): OtpvV3ArchiveEntry => this.toArchiveEntry(entry),
      );

      /*
       * Primero validamos exclusivamente metadatos ZIP:
       * rutas, duplicados, symlinks, raíces, límites
       * y presencia de los cuatro ficheros obligatorios.
       */
      validateOtpvV3PayloadEntries(archiveEntries);

      /*
       * Después recorremos todos los streams reales.
       * Esto evita depender únicamente de los tamaños
       * declarados en el índice ZIP.
       */
      const totalUncompressedSize: number = await this.validateEntryStreams(zipFile, entries);

      const regularFileCount: number = archiveEntries.filter(
        (entry: OtpvV3ArchiveEntry): boolean => !entry.isDirectory,
      ).length;

      return {
        entries: archiveEntries,
        regularFileCount,
        totalUncompressedSize,
      };
    } finally {
      zipFile.close();
    }
  }

  /**
   * Comprueba las propiedades físicas básicas
   * del ZIP interior descifrado.
   */
  private assertPayloadFile(payloadStats: Stats): void {
    if (!payloadStats.isFile()) {
      throw new Error('El payload descifrado no es un fichero regular.');
    }

    if (payloadStats.size === 0) {
      throw new Error('El payload descifrado está vacío.');
    }

    /*
     * El ZIP interior procede de payload.enc,
     * cuyo contenedor exterior ya está limitado
     * al máximo físico admitido por v3.
     */
    if (payloadStats.size > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
      throw new Error('El payload descifrado supera el tamaño máximo permitido.');
    }
  }

  /**
   * Abre el ZIP interior manteniéndolo disponible
   * después de leer su índice.
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
              new Error('El payload descifrado no contiene un ZIP válido.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('No se ha podido abrir el ZIP interior de la copia.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  /**
   * Lee el índice completo aplicando desde el principio
   * el máximo de entradas permitido.
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
            if (entries.length >= OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT) {
              throw new Error('El payload contiene demasiadas entradas.');
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
   * Recorre secuencialmente todos los ficheros
   * regulares y valida sus tamaños reales.
   */
  private async validateEntryStreams(zipFile: ZipFile, entries: readonly Entry[]): Promise<number> {
    let totalUncompressedSize: number = 0;

    for (const entry of entries) {
      if (entry.fileName.endsWith('/')) {
        continue;
      }

      const entrySize: number = await this.measureEntryStream(
        zipFile,
        entry,
        totalUncompressedSize,
      );

      totalUncompressedSize += entrySize;
    }

    return totalUncompressedSize;
  }

  /**
   * Lee completamente una entrada y comprueba
   * su tamaño real durante el streaming.
   */
  private async measureEntryStream(
    zipFile: ZipFile,
    entry: Entry,
    previousTotalSize: number,
  ): Promise<number> {
    const stream: Readable = await this.openEntryStream(zipFile, entry);

    let entrySize: number = 0;

    const validator: Writable = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
      ): void {
        entrySize += chunk.length;

        if (entrySize > entry.uncompressedSize || entrySize > OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES) {
          callback(new Error(`La entrada ${entry.fileName} supera el tamaño permitido.`));

          return;
        }

        if (previousTotalSize + entrySize > OTPV_V3_MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES) {
          callback(
            new Error(
              ['El contenido descomprimido del payload', 'supera el tamaño máximo permitido.'].join(
                ' ',
              ),
            ),
          );

          return;
        }

        callback();
      },
    });

    await pipeline(stream, validator);

    if (entrySize !== entry.uncompressedSize) {
      throw new Error(`El tamaño real de ${entry.fileName} no coincide con el declarado.`);
    }

    return entrySize;
  }

  /**
   * Abre el stream descomprimido de una entrada.
   */
  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>(
      (resolve: (stream: Readable) => void, reject: (reason?: unknown) => void): void => {
        zipFile.openReadStream(entry, (error: Error | null, stream?: Readable): void => {
          if (error !== null) {
            reject(
              new Error(`No se ha podido leer ${entry.fileName} del payload.`, {
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
   * Traduce una entrada yauzl al contrato común
   * utilizado por los validadores v3.
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
   * los atributos POSIX almacenados en ZIP.
   */
  private isSymbolicLink(entry: Entry): boolean {
    const unixMode: number = (entry.externalFileAttributes >>> 16) & 0xffff;

    return (unixMode & 0o170000) === 0o120000;
  }
}
