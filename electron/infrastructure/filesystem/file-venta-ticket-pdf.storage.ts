import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import { randomUUID } from 'node:crypto';
import { access, mkdir, open, readFile, rename, rm, type FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

const PDF_SIGNATURE: Uint8Array = new TextEncoder().encode('%PDF-');
const MAX_TICKET_PDF_SIZE: number = 10 * 1024 * 1024;
const MAX_ARCHIVE_NAME_ATTEMPTS: number = 10_000;

type RemoveFile = (
  filePath: string,
  options: {
    readonly force: boolean;
  },
) => Promise<void>;

type RenameFile = (oldPath: string, newPath: string) => Promise<void>;

export default class FileVentaTicketPdfStorage implements VentaTicketPdfStorage {
  /**
   * Crea el almacenamiento de PDFs definitivos de tickets.
   */
  constructor(
    private readonly directory: string,
    private readonly applicationLogger: ApplicationLogger,
    private readonly removeFile: RemoveFile = rm,
    private readonly renameFile: RenameFile = rename,
    private readonly createTemporaryId: () => string = randomUUID,
  ) {}

  /**
   * Comprueba si existe el PDF actualmente vigente de una venta.
   */
  async exists(idVenta: number): Promise<boolean> {
    this.validateVentaId(idVenta);

    return this.fileExists(this.getFilePath(idVenta));
  }

  /**
   * Recupera el PDF vigente y valida que siga siendo
   * un documento PDF aceptable antes de devolverlo.
   */
  async read(idVenta: number): Promise<Uint8Array | null> {
    this.validateVentaId(idVenta);

    try {
      const pdf: Uint8Array = new Uint8Array(await readFile(this.getFilePath(idVenta)));

      this.validatePdf(pdf);

      return pdf;
    } catch (error: unknown) {
      if (this.hasErrorCode(error, 'ENOENT')) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Conserva un nuevo PDF vigente y archiva previamente
   * el documento anterior cuando exista.
   */
  async save(idVenta: number, pdf: Uint8Array): Promise<void> {
    this.validateVentaId(idVenta);
    this.validatePdf(pdf);

    await mkdir(this.directory, {
      recursive: true,
    });

    const filePath: string = this.getFilePath(idVenta);

    const temporaryFilePath: string = join(
      this.directory,
      `${idVenta}.${this.createTemporaryId()}.tmp`,
    );

    const handle: FileHandle = await open(temporaryFilePath, 'wx', 0o600);

    let archivedFilePath: string | null = null;

    try {
      try {
        await handle.writeFile(pdf);
      } finally {
        await handle.close();
      }

      if (await this.fileExists(filePath)) {
        archivedFilePath = await this.getAvailableArchiveFilePath(idVenta);

        await this.renameFile(filePath, archivedFilePath);
      }

      try {
        await this.renameFile(temporaryFilePath, filePath);
      } catch (error: unknown) {
        if (archivedFilePath !== null) {
          await this.restoreArchivedFileSafely(archivedFilePath, filePath);
        }

        throw error;
      }
    } catch (error: unknown) {
      await this.removeTemporaryFileSafely(temporaryFilePath);

      throw error;
    }
  }

  /**
   * Devuelve la ruta del PDF vigente de una venta.
   */
  private getFilePath(idVenta: number): string {
    return join(this.directory, `${idVenta}.pdf`);
  }

  /**
   * Busca un nombre de archivo histórico que no exista todavía.
   */
  private async getAvailableArchiveFilePath(idVenta: number): Promise<string> {
    const now: number = Date.now();

    for (let attempt: number = 0; attempt < MAX_ARCHIVE_NAME_ATTEMPTS; attempt += 1) {
      const timestamp: string = this.formatArchiveTimestamp(new Date(now + attempt));

      const filePath: string = join(this.directory, `${idVenta}_${timestamp}.pdf`);

      if (!(await this.fileExists(filePath))) {
        return filePath;
      }
    }

    throw new Error('No se ha podido generar un nombre único para archivar el ticket anterior.');
  }

  /**
   * Genera un timestamp compatible con nombres de archivo de Windows.
   */
  private formatArchiveTimestamp(date: Date): string {
    return date.toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Valida el identificador interno de una venta.
   */
  private validateVentaId(idVenta: number): void {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }
  }

  /**
   * Valida defensivamente el contenido recibido como PDF.
   */
  private validatePdf(pdf: Uint8Array): void {
    if (!(pdf instanceof Uint8Array)) {
      throw new TypeError('El documento PDF no es válido.');
    }

    if (pdf.length < PDF_SIGNATURE.length) {
      throw new Error('El documento recibido no contiene un PDF válido.');
    }

    if (pdf.length > MAX_TICKET_PDF_SIZE) {
      throw new RangeError('El PDF del ticket supera el tamaño máximo permitido.');
    }

    for (let index: number = 0; index < PDF_SIGNATURE.length; index += 1) {
      if (pdf[index] !== PDF_SIGNATURE[index]) {
        throw new Error('El documento recibido no contiene un PDF válido.');
      }
    }
  }

  /**
   * Comprueba la existencia de una ruta.
   *
   * Solo ENOENT representa ausencia; cualquier otro
   * error del filesystem debe propagarse.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);

      return true;
    } catch (error: unknown) {
      if (this.hasErrorCode(error, 'ENOENT')) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Intenta restaurar el PDF archivado cuando falla
   * la promoción del nuevo temporal.
   */
  private async restoreArchivedFileSafely(
    archivedFilePath: string,
    filePath: string,
  ): Promise<void> {
    try {
      if (await this.fileExists(filePath)) {
        return;
      }

      await this.renameFile(archivedFilePath, filePath);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'restore-ticket-pdf-after-promotion-error',
        message:
          'No se ha podido restaurar el PDF anterior del ticket después de fallar una nueva revisión.',
        error,
      });
    }
  }

  /**
   * Comprueba defensivamente el código de un error de Node.
   */
  private hasErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { readonly code: unknown }).code === code
    );
  }

  /**
   * Limpia un temporal sin ocultar el error principal.
   */
  private async removeTemporaryFileSafely(filePath: string): Promise<void> {
    try {
      await this.removeFile(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'ticket-pdf-temp-cleanup',
        message: 'No se ha podido limpiar el PDF temporal de un ticket.',
        error,
      });
    }
  }
}
