import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import FileClienteFacturaPdfStorage from '@infrastructure/filesystem/file-cliente-factura-pdf.storage';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('FileClienteFacturaPdfStorage', (): void => {
  let directory: string;
  let storage: FileClienteFacturaPdfStorage;
  let applicationLogger: TestApplicationLogger;

  beforeEach(async (): Promise<void> => {
    directory = await mkdtemp(join(tmpdir(), 'osumi-factura-pdf-'));
    applicationLogger = new TestApplicationLogger();
    storage = new FileClienteFacturaPdfStorage(directory, applicationLogger);
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

  it('registra sin propagar un fallo limpiando el PDF temporal', async (): Promise<void> => {
    const cleanupError: Error = new Error('No se ha podido eliminar el temporal.');

    const removeFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      void filePath;
      void options;

      throw cleanupError;
    };

    const failingStorage = new FileClienteFacturaPdfStorage(
      directory,
      applicationLogger,
      removeFile,
    );

    await expect(
      failingStorage.save('factura-cleanup', createPdf('contenido')),
    ).resolves.toBeUndefined();

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'invoice-pdf-temp-cleanup',
        message: 'No se ha podido limpiar un PDF temporal de una factura.',
        error: cleanupError,
      },
    ]);
  });

  it('conserva un temporal ajeno cuando la apertura devuelve EEXIST', async (): Promise<void> => {
    const temporaryPath: string = join(directory, 'factura-colision.id-fijo.tmp');

    await writeFile(temporaryPath, 'contenido-ajeno');

    const collisionStorage = new FileClienteFacturaPdfStorage(
      directory,
      applicationLogger,
      undefined,
      (): string => 'id-fijo',
    );

    await expect(
      collisionStorage.save('factura-colision', createPdf('nuevo')),
    ).rejects.toMatchObject({
      code: 'EEXIST',
    });

    await expect(readFile(temporaryPath, 'utf8')).resolves.toBe('contenido-ajeno');
    await expect(collisionStorage.read('factura-colision')).resolves.toBeNull();
    expect(applicationLogger.warnEvents).toEqual([]);
  });
});

/**
 * Crea bytes mínimos con firma PDF suficiente
 * para las pruebas del storage.
 */
function createPdf(content: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${content}`);
}

class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  debug(event: ApplicationLogEvent): void {
    void event;
  }

  info(event: ApplicationLogEvent): void {
    void event;
  }

  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  error(event: ApplicationLogEvent): void {
    void event;
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }
}
