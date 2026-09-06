import type ClienteFacturaPdfStorage from '@backend/contracts/clientes/cliente-factura-pdf-storage.interface';
import { randomUUID } from 'node:crypto';
import { constants, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PDF_SIGNATURE: Uint8Array = new TextEncoder().encode('%PDF-');
const MAX_FACTURA_PDF_SIZE: number = 25 * 1024 * 1024;
const PUBLIC_ID_PATTERN: RegExp = /^[A-Za-z0-9_-]{1,128}$/;

export default class FileClienteFacturaPdfStorage implements ClienteFacturaPdfStorage {
  constructor(private readonly directory: string) {}

  /**
   * Recupera el PDF definitivo cuando existe y
   * valida defensivamente sus bytes.
   */
  async read(facturaPublicId: string): Promise<Uint8Array | null> {
    const normalizedPublicId: string = this.normalizePublicId(facturaPublicId);

    try {
      const pdf: Uint8Array = new Uint8Array(await readFile(this.getFilePath(normalizedPublicId)));

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
   * Guarda el primer PDF válido sin permitir nunca
   * sustituir unos bytes ya materializados.
   */
  async save(facturaPublicId: string, pdf: Uint8Array): Promise<void> {
    const normalizedPublicId: string = this.normalizePublicId(facturaPublicId);

    this.validatePdf(pdf);

    await mkdir(this.directory, {
      recursive: true,
    });

    const currentPdf: Uint8Array | null = await this.read(normalizedPublicId);

    if (currentPdf !== null) {
      return;
    }

    const filePath: string = this.getFilePath(normalizedPublicId);
    const temporaryFilePath: string = join(
      this.directory,
      `${normalizedPublicId}.${randomUUID()}.tmp`,
    );

    try {
      await writeFile(temporaryFilePath, pdf, {
        mode: 0o600,
      });

      try {
        /*
         * COPYFILE_EXCL evita que una segunda
         * materialización pueda sobrescribir la primera.
         */
        await copyFile(temporaryFilePath, filePath, constants.COPYFILE_EXCL);
      } catch (error: unknown) {
        if (!this.hasErrorCode(error, 'EEXIST')) {
          throw error;
        }

        /*
         * Otra operación ganó la carrera.
         * Validamos los bytes que han quedado fijados.
         */
        const existingPdf: Uint8Array | null = await this.read(normalizedPublicId);

        if (existingPdf === null) {
          throw new Error('No se ha podido conservar el PDF definitivo de la factura.', {
            cause: error,
          });
        }
      }
    } finally {
      await this.removeTemporaryFileSafely(temporaryFilePath);
    }
  }

  /**
   * Construye la ruta interna del documento.
   */
  private getFilePath(facturaPublicId: string): string {
    return join(this.directory, `${facturaPublicId}.pdf`);
  }

  /**
   * Valida un identificador antes de utilizarlo
   * como parte de una ruta local.
   */
  private normalizePublicId(value: string): string {
    if (typeof value !== 'string') {
      throw new TypeError('El identificador de la factura no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (!PUBLIC_ID_PATTERN.test(normalizedValue)) {
      throw new Error('El identificador de la factura no es válido.');
    }

    return normalizedValue;
  }

  /**
   * Valida firma y tamaño máximo de un PDF.
   */
  private validatePdf(pdf: Uint8Array): void {
    if (!(pdf instanceof Uint8Array)) {
      throw new TypeError('El documento PDF no es válido.');
    }

    if (pdf.length < PDF_SIGNATURE.length) {
      throw new Error('El documento recibido no contiene un PDF válido.');
    }

    if (pdf.length > MAX_FACTURA_PDF_SIZE) {
      throw new RangeError('El PDF de la factura supera el tamaño máximo permitido.');
    }

    for (let index: number = 0; index < PDF_SIGNATURE.length; index += 1) {
      if (pdf[index] !== PDF_SIGNATURE[index]) {
        throw new Error('El documento recibido no contiene un PDF válido.');
      }
    }
  }

  /**
   * Comprueba defensivamente el código de un error.
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
   * Elimina un temporal sin ocultar el error
   * principal de materialización.
   */
  private async removeTemporaryFileSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido limpiar el PDF temporal de la factura:', error);
    }
  }
}
