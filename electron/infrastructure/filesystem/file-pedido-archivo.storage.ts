import type PedidoArchivoStorage from '@backend/contracts/compras/pedidos/pedido-archivo-storage.interface';
import type PedidoArchivoStoredRecord from '@backend/domain/compras/pedidos/pedido-archivo-stored-record.interface';
import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ORDER_FILES_DIRECTORY: string = 'orders';

const PDF_MIME_TYPE: string = 'application/pdf';

const MAXIMUM_PDF_SIZE: number = 100 * 1024 * 1024;

const PDF_SIGNATURE: Buffer = Buffer.from('%PDF-', 'ascii');

const PUBLIC_ID_PATTERN: RegExp = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Gestiona físicamente los PDFs asociados
 * a Pedidos.
 */
export default class FilePedidoArchivoStorage implements PedidoArchivoStorage {
  constructor(private readonly filesDirectory: string) {}

  /**
   * Valida y copia un PDF al almacenamiento
   * definitivo de Pedidos.
   */
  async save(publicId: string, sourcePath: string): Promise<PedidoArchivoStoredRecord> {
    const normalizedPublicId: string = this.normalizePublicId(publicId);

    if (typeof sourcePath !== 'string' || sourcePath.trim().length === 0) {
      throw new Error('La ruta del PDF seleccionado no es válida.');
    }

    const sourceStats = await stat(sourcePath);

    if (!sourceStats.isFile()) {
      throw new Error('El PDF seleccionado no es un archivo válido.');
    }

    if (sourceStats.size > MAXIMUM_PDF_SIZE) {
      throw new RangeError('El PDF seleccionado supera los 100 MB permitidos.');
    }

    const targetDirectory: string = join(this.filesDirectory, ORDER_FILES_DIRECTORY);

    await mkdir(targetDirectory, {
      recursive: true,
    });

    const internalName: string = `${normalizedPublicId}.pdf`;

    const destinationPath: string = join(targetDirectory, internalName);

    const temporaryPath: string = join(
      targetDirectory,
      `${normalizedPublicId}.${randomUUID()}.tmp`,
    );

    const hash = createHash('sha256');

    let actualSize: number = 0;
    let signature: Buffer = Buffer.alloc(0);

    const verifier: Transform = new Transform({
      transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error: Error | null, data?: Buffer) => void,
      ): void {
        actualSize += chunk.length;

        if (actualSize > MAXIMUM_PDF_SIZE) {
          callback(new RangeError('El PDF seleccionado supera los 100 MB permitidos.'));

          return;
        }

        if (signature.length < PDF_SIGNATURE.length) {
          const remaining: number = PDF_SIGNATURE.length - signature.length;

          signature = Buffer.concat([signature, chunk.subarray(0, remaining)]);

          if (signature.length === PDF_SIGNATURE.length && !signature.equals(PDF_SIGNATURE)) {
            callback(new Error('El archivo seleccionado no contiene un PDF válido.'));

            return;
          }
        }

        hash.update(chunk);
        callback(null, chunk);
      },
    });

    let destinationCreated: boolean = false;

    try {
      await pipeline(
        createReadStream(sourcePath),
        verifier,
        createWriteStream(temporaryPath, {
          mode: 0o600,
          flags: 'wx',
        }),
      );

      if (actualSize < PDF_SIGNATURE.length || !signature.equals(PDF_SIGNATURE)) {
        throw new Error('El archivo seleccionado no contiene un PDF válido.');
      }

      if (actualSize !== sourceStats.size) {
        throw new Error('El PDF seleccionado ha cambiado mientras se estaba leyendo.');
      }

      const sha256: string = hash.digest('hex');

      await copyFile(temporaryPath, destinationPath, constants.COPYFILE_EXCL);

      destinationCreated = true;

      return {
        originalName: basename(sourcePath),
        internalName,
        relativePath: ['files', ORDER_FILES_DIRECTORY, internalName].join('/'),
        mimeType: PDF_MIME_TYPE,
        sizeBytes: actualSize,
        sha256,
      };
    } catch (error: unknown) {
      if (destinationCreated) {
        await this.removeFileSafely(destinationPath);
      }

      throw error;
    } finally {
      await this.removeFileSafely(temporaryPath);
    }
  }

  /**
   * Abre un PDF gestionado mediante la aplicación
   * predeterminada del sistema operativo.
   */
  async open(publicId: string): Promise<void> {
    const normalizedPublicId: string = this.normalizePublicId(publicId);

    const filePath: string = this.getManagedPdfPath(normalizedPublicId);

    try {
      const fileStats = await stat(filePath);

      if (!fileStats.isFile()) {
        throw new Error('El PDF solicitado no está disponible.');
      }
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error('El PDF solicitado no está disponible.', {
          cause: error,
        });
      }

      throw error;
    }

    const { shell } = await import('electron');

    const errorMessage: string = await shell.openPath(filePath);

    if (errorMessage.length > 0) {
      throw new Error(`No se ha podido abrir el PDF: ${errorMessage}`);
    }
  }

  /**
   * Elimina un PDF definitivo gestionado.
   */
  async remove(publicId: string): Promise<void> {
    const normalizedPublicId: string = this.normalizePublicId(publicId);

    await rm(this.getManagedPdfPath(normalizedPublicId), {
      force: true,
    });
  }

  /**
   * Construye la ruta absoluta de un PDF de Pedido
   * a partir de un identificador ya validado.
   */
  private getManagedPdfPath(publicId: string): string {
    return join(this.filesDirectory, ORDER_FILES_DIRECTORY, `${publicId}.pdf`);
  }

  /**
   * Valida un identificador antes de utilizarlo
   * dentro de una ruta gestionada.
   */
  private normalizePublicId(value: string): string {
    if (typeof value !== 'string') {
      throw new TypeError('El identificador del PDF no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (!PUBLIC_ID_PATTERN.test(normalizedValue)) {
      throw new Error('El identificador del PDF no es válido.');
    }

    return normalizedValue;
  }

  /**
   * Limpia un archivo auxiliar sin ocultar
   * el error principal de la operación.
   */
  private async removeFileSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido limpiar un archivo temporal de Pedido:', error);
    }
  }
}
