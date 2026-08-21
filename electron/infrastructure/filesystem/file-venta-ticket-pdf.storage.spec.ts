import FileVentaTicketPdfStorage from '@infrastructure/filesystem/file-venta-ticket-pdf.storage';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

  it('guarda el PDF histórico de una venta', async (): Promise<void> => {
    const directory: string = getTicketsDirectory();

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    const pdf: Uint8Array = createPdf('ticket-original');

    await storage.save(123, pdf);

    const savedPdf: Buffer = await readFile(join(directory, '123.pdf'));

    expect(savedPdf.toString('utf8')).toBe(Buffer.from(pdf).toString('utf8'));
  });

  it('crea el directorio de tickets si todavía no existe', async (): Promise<void> => {
    const directory: string = join(requireTempDirectory(), 'uno', 'dos', 'ventas', 'tickets');

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    await storage.save(123, createPdf('ticket'));

    const savedPdf: Buffer = await readFile(join(directory, '123.pdf'));

    expect(savedPdf.toString('utf8')).toContain('%PDF-');
  });

  it('no sobrescribe un PDF histórico que ya existe', async (): Promise<void> => {
    const directory: string = getTicketsDirectory();

    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(directory);

    await storage.save(123, createPdf('documento-original'));

    await storage.save(123, createPdf('documento-nuevo'));

    const savedPdf: Buffer = await readFile(join(directory, '123.pdf'));

    expect(savedPdf.toString('utf8')).toContain('documento-original');

    expect(savedPdf.toString('utf8')).not.toContain('documento-nuevo');
  });

  it('rechaza identificadores de venta no válidos', async (): Promise<void> => {
    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(getTicketsDirectory());

    const pdf: Uint8Array = createPdf('ticket');

    await expect(storage.save(0, pdf)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    await expect(storage.save(-1, pdf)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    await expect(storage.save(1.5, pdf)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );
  });

  it('rechaza contenido que no sea un PDF', async (): Promise<void> => {
    const storage: FileVentaTicketPdfStorage = new FileVentaTicketPdfStorage(getTicketsDirectory());

    const invalidPdf: Uint8Array = new TextEncoder().encode('esto no es un pdf');

    await expect(storage.save(123, invalidPdf)).rejects.toThrow(
      'El documento recibido no contiene un PDF válido.',
    );
  });
});

function createPdf(content: string): Uint8Array {
  return Buffer.from(`%PDF-1.7\n${content}\n%%EOF`, 'utf8');
}

function getTicketsDirectory(): string {
  return join(requireTempDirectory(), 'ventas', 'tickets');
}

function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}
