import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PDF_SIGNATURE: Uint8Array = new TextEncoder().encode('%PDF-');

const MAX_TICKET_PDF_SIZE: number = 10 * 1024 * 1024;

export default class FileVentaTicketPdfStorage implements VentaTicketPdfStorage {
  constructor(private readonly directory: string) {}

  async save(idVenta: number, pdf: Uint8Array): Promise<void> {
    this.validateVentaId(idVenta);
    this.validatePdf(pdf);

    await mkdir(this.directory, {
      recursive: true,
    });

    const filePath: string = this.getFilePath(idVenta);

    /*
     * El PDF histórico es write-once.
     *
     * Si ya existe, nunca lo regeneramos ni sustituimos
     * por una versión producida con una plantilla posterior.
     */
    if (await this.fileExists(filePath)) {
      return;
    }

    const temporaryFilePath: string = `${filePath}.tmp`;

    try {
      await writeFile(temporaryFilePath, pdf, {
        mode: 0o600,
      });

      /*
       * Repetimos la comprobación antes de promover el temporal.
       *
       * En el flujo normal solo existe un escritor, pero esta
       * segunda protección evita sustituir el histórico si dos
       * procesos post-COMMIT llegasen accidentalmente hasta aquí.
       */
      if (await this.fileExists(filePath)) {
        await rm(temporaryFilePath, {
          force: true,
        });

        return;
      }

      await rename(temporaryFilePath, filePath);
    } catch (error: unknown) {
      await this.removeTemporaryFileSafely(temporaryFilePath);

      throw error;
    }
  }

  private getFilePath(idVenta: number): string {
    return join(this.directory, `${idVenta}.pdf`);
  }

  private validateVentaId(idVenta: number): void {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }
  }

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

    for (let index: number = 0; index < PDF_SIGNATURE.length; index++) {
      if (pdf[index] !== PDF_SIGNATURE[index]) {
        throw new Error('El documento recibido no contiene un PDF válido.');
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);

      return true;
    } catch {
      return false;
    }
  }

  private async removeTemporaryFileSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido limpiar el PDF temporal del ticket:', error);
    }
  }
}
