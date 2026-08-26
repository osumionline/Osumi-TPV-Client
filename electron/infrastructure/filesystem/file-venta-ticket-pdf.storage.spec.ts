import FileVentaTicketPdfStorage from '@infrastructure/filesystem/file-venta-ticket-pdf.storage';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('FileVentaTicketPdfStorage', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-ticket-pdf-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('guarda el PDF vigente de una venta', async (): Promise<void> => {
    const directory: string = getTicketsDirectory();

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    const pdf: Uint8Array = createPdf('ticket-original');

    await storage.save(123, pdf);

    const savedPdf: Buffer = await readFile(join(directory, '123.pdf'));

    expect(savedPdf.toString('utf8')).toBe(Buffer.from(pdf).toString('utf8'));

    expect(await storage.exists(123)).toBe(true);
  });

  it('crea el directorio de tickets si todavía no existe', async (): Promise<void> => {
    const directory: string = join(requireTempDirectory(), 'uno', 'dos', 'ventas', 'tickets');

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    await storage.save(123, createPdf('ticket'));

    expect(await storage.exists(123)).toBe(true);
  });

  it('archiva el PDF anterior y promueve la nueva revisión', async (): Promise<void> => {
    const directory: string = getTicketsDirectory();

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    await storage.save(123, createPdf('documento-original'));

    await storage.save(123, createPdf('documento-nuevo'));

    const currentPdf: Buffer = await readFile(join(directory, '123.pdf'));

    expect(currentPdf.toString('utf8')).toContain('documento-nuevo');

    const files: readonly string[] = await readdir(directory);

    const archivedFiles: readonly string[] = files.filter((file: string): boolean =>
      /^123_\d{4}-\d{2}-\d{2}T.+Z\.pdf$/.test(file),
    );

    expect(archivedFiles).toHaveLength(1);

    const archivedFile: string | undefined = archivedFiles[0];

    if (archivedFile === undefined) {
      throw new Error('No se ha encontrado el PDF histórico esperado.');
    }

    const archivedPdf: Buffer = await readFile(join(directory, archivedFile));

    expect(archivedPdf.toString('utf8')).toContain('documento-original');
  });

  it('informa de que no existe un PDF todavía no generado', async (): Promise<void> => {
    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(getTicketsDirectory());

    expect(await storage.exists(123)).toBe(false);
  });

  it('rechaza identificadores de venta no válidos', async (): Promise<void> => {
    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(getTicketsDirectory());

    const pdf: Uint8Array = createPdf('ticket');

    await expect(storage.save(0, pdf)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    await expect(storage.exists(-1)).rejects.toThrow('El identificador de la venta no es válido.');
  });

  it('rechaza contenido que no sea un PDF', async (): Promise<void> => {
    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(getTicketsDirectory());

    const invalidPdf: Uint8Array = new TextEncoder().encode('esto no es un pdf');

    await expect(storage.save(123, invalidPdf)).rejects.toThrow(
      'El documento recibido no contiene un PDF válido.',
    );
  });
});

/**
 * Construye un PDF mínimo suficiente para el test.
 */
function createPdf(content: string): Uint8Array {
  return Buffer.from(`%PDF-1.7\n${content}\n%%EOF`, 'utf8');
}

/**
 * Devuelve el directorio de tickets del test actual.
 */
function getTicketsDirectory(): string {
  return join(requireTempDirectory(), 'ventas', 'tickets');
}

/**
 * Devuelve obligatoriamente el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}
