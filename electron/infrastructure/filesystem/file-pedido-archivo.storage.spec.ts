import FilePedidoArchivoStorage from '@infrastructure/filesystem/file-pedido-archivo.storage';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

let filesDirectory: string | null = null;

let storage: FilePedidoArchivoStorage | null = null;

describe('FilePedidoArchivoStorage', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-order-pdf-'));

    filesDirectory = join(tempDirectory, 'files');

    storage = new FilePedidoArchivoStorage(filesDirectory);
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    storage = null;
    filesDirectory = null;
    tempDirectory = null;
  });

  it('valida copia y calcula el hash de un PDF', async (): Promise<void> => {
    const pdf: Buffer = Buffer.from('%PDF-1.7\nDocumento de prueba\n%%EOF');

    const sourcePath: string = join(requireTempDirectory(), 'Factura proveedor.pdf');

    await writeFile(sourcePath, pdf);

    const result = await requireStorage().save('pdf-test-1', sourcePath);

    expect(result).toEqual({
      originalName: 'Factura proveedor.pdf',
      internalName: 'pdf-test-1.pdf',
      relativePath: 'files/orders/pdf-test-1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
      sha256: createHash('sha256').update(pdf).digest('hex'),
    });

    expect(await readFile(join(requireFilesDirectory(), 'orders', 'pdf-test-1.pdf'))).toEqual(pdf);
  });

  it('rechaza un archivo que no contiene una firma PDF', async (): Promise<void> => {
    const sourcePath: string = join(requireTempDirectory(), 'falso.pdf');

    await writeFile(sourcePath, 'esto no es un pdf');

    await expect(requireStorage().save('pdf-invalid', sourcePath)).rejects.toThrow(
      'El archivo seleccionado no contiene un PDF válido.',
    );

    await expect(
      access(join(requireFilesDirectory(), 'orders', 'pdf-invalid.pdf')),
    ).rejects.toThrow();
  });

  it('rechaza PDFs superiores a cien megabytes', async (): Promise<void> => {
    const sourcePath: string = join(requireTempDirectory(), 'demasiado-grande.pdf');

    await writeFile(sourcePath, '%PDF-');

    await truncate(sourcePath, 100 * 1024 * 1024 + 1);

    await expect(requireStorage().save('pdf-large', sourcePath)).rejects.toThrow(
      'El PDF seleccionado supera los 100 MB permitidos.',
    );
  });

  it('puede eliminar un PDF gestionado', async (): Promise<void> => {
    const sourcePath: string = join(requireTempDirectory(), 'documento.pdf');

    await writeFile(sourcePath, '%PDF-1.4\n%%EOF');

    await requireStorage().save('pdf-remove', sourcePath);

    await requireStorage().remove('pdf-remove');

    await expect(
      access(join(requireFilesDirectory(), 'orders', 'pdf-remove.pdf')),
    ).rejects.toThrow();
  });
});

/**
 * Devuelve el almacenamiento inicializado.
 */
function requireStorage(): FilePedidoArchivoStorage {
  if (storage === null) {
    throw new Error('El almacenamiento no está inicializado.');
  }

  return storage;
}

/**
 * Devuelve el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}

/**
 * Devuelve la raíz de archivos activa.
 */
function requireFilesDirectory(): string {
  if (filesDirectory === null) {
    throw new Error('El directorio de archivos no está inicializado.');
  }

  return filesDirectory;
}
