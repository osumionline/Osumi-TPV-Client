import FileClienteFacturaPdfStorage from '@infrastructure/filesystem/file-cliente-factura-pdf.storage';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('FileClienteFacturaPdfStorage', (): void => {
  let directory: string;
  let storage: FileClienteFacturaPdfStorage;

  beforeEach(async (): Promise<void> => {
    directory = await mkdtemp(join(tmpdir(), 'osumi-factura-pdf-'));

    storage = new FileClienteFacturaPdfStorage(directory);
  });

  afterEach(async (): Promise<void> => {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  });

  it('guarda y recupera un PDF válido', async (): Promise<void> => {
    const pdf: Uint8Array = createPdf('primero');

    await storage.save('factura-1', pdf);

    expect(await storage.read('factura-1')).toEqual(pdf);
  });

  it('no sustituye nunca un PDF definitivo ya existente', async (): Promise<void> => {
    const firstPdf: Uint8Array = createPdf('primero');
    const secondPdf: Uint8Array = createPdf('segundo');

    await storage.save('factura-1', firstPdf);
    await storage.save('factura-1', secondPdf);

    expect(await storage.read('factura-1')).toEqual(firstPdf);

    expect(new Uint8Array(await readFile(join(directory, 'factura-1.pdf')))).toEqual(firstPdf);
  });

  it('devuelve null cuando todavía no existe un PDF', async (): Promise<void> => {
    expect(await storage.read('factura-1')).toBeNull();
  });

  it('rechaza bytes que no representan un PDF', async (): Promise<void> => {
    await expect(storage.save('factura-1', new TextEncoder().encode('no-pdf'))).rejects.toThrow(
      'El documento recibido no contiene un PDF válido.',
    );
  });

  it('rechaza identificadores que puedan escapar del directorio administrado', async (): Promise<void> => {
    await expect(storage.save('../factura', createPdf('contenido'))).rejects.toThrow(
      'El identificador de la factura no es válido.',
    );
  });
});

/**
 * Crea bytes mínimos con firma PDF suficiente
 * para las pruebas del storage.
 */
function createPdf(content: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${content}`);
}
