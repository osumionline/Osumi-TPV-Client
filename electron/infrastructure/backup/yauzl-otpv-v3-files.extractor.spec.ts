import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import YauzlOtpvV3FilesExtractor from '@infrastructure/backup/yauzl-otpv-v3-files.extractor';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZipFile } from 'yazl';

interface PayloadEntry {
  readonly path: string;
  readonly content: Buffer | string;
}

let tempDirectory: string | null = null;

describe('YauzlOtpvV3FilesExtractor', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-files-extractor-'));
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

  it('extrae files/** conservando su jerarquía', async (): Promise<void> => {
    const payloadFile: string = getPath('payload.zip');

    const destinationDirectory: string = getPath('files');

    await writePayload(payloadFile, [
      ...createRequiredEntries(),

      {
        path: 'files/fotos/10.webp',
        content: 'foto-10',
      },

      {
        path: 'files/clientes/facturas/25.pdf',
        content: 'factura-25',
      },

      {
        path: 'files/root.txt',
        content: 'fichero-raiz',
      },
    ]);

    const extractor = new YauzlOtpvV3FilesExtractor(new TestApplicationLogger());

    await extractor.extract(payloadFile, destinationDirectory);

    expect(
      await readFile(join(destinationDirectory, 'fotos', '10.webp'), {
        encoding: 'utf8',
      }),
    ).toBe('foto-10');

    expect(
      await readFile(join(destinationDirectory, 'clientes', 'facturas', '25.pdf'), {
        encoding: 'utf8',
      }),
    ).toBe('factura-25');

    expect(
      await readFile(join(destinationDirectory, 'root.txt'), {
        encoding: 'utf8',
      }),
    ).toBe('fichero-raiz');
  });

  it('crea una carpeta files vacía cuando el backup no contiene recursos adicionales', async (): Promise<void> => {
    const payloadFile: string = getPath('empty-files.zip');

    const destinationDirectory: string = getPath('files');

    await writePayload(payloadFile, createRequiredEntries());

    const extractor = new YauzlOtpvV3FilesExtractor(new TestApplicationLogger());

    await extractor.extract(payloadFile, destinationDirectory);

    expect(await readdir(destinationDirectory)).toEqual([]);
  });

  it('registra un fallo de limpieza del directorio sin propagarlo', async (): Promise<void> => {
    const logger: TestApplicationLogger = new TestApplicationLogger();
    const cleanupError: Error = new Error('Fallo simulado eliminando el directorio.');
    const destinationDirectory: string = getPath('files');

    const removeDirectory = async (
      directory: string,
      options: {
        readonly recursive: boolean;
        readonly force: boolean;
      },
    ): Promise<void> => {
      expect(directory).toBe(destinationDirectory);
      expect(options).toEqual({
        recursive: true,
        force: true,
      });

      throw cleanupError;
    };

    const extractor = new YauzlOtpvV3FilesExtractor(logger, removeDirectory);

    await expect(
      extractor['cleanDestinationSafely'](destinationDirectory),
    ).resolves.toBeUndefined();

    expect(logger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'restore-files-directory-cleanup',
        message: 'No se ha podido limpiar el directorio temporal de archivos restaurados.',
        error: cleanupError,
      },
    ]);

    expect(logger.warnEvents[0].context).toBeUndefined();
  });

  it('preserva el error de extracción aunque falle la limpieza del archivo temporal', async (): Promise<void> => {
    const logger: TestApplicationLogger = new TestApplicationLogger();

    const payloadFile: string = getPath('failed-entry.zip');
    const destinationDirectory: string = getPath('files');

    await writePayload(payloadFile, [
      ...createRequiredEntries(),
      {
        path: 'files/foto.webp',
        content: 'contenido-de-prueba',
      },
    ]);

    const extractionError: Error = new Error('Fallo simulado leyendo el archivo.');
    const cleanupError: Error = new Error('Fallo simulado eliminando el temporal.');

    const removedFiles: string[] = [];

    const removeTemporaryFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      removedFiles.push(filePath);

      expect(options.force).toBe(true);

      throw cleanupError;
    };

    const extractor = new YauzlOtpvV3FilesExtractor(logger, rm, removeTemporaryFile);

    const originalOpenEntryStream = extractor['openEntryStream'].bind(extractor);

    const streamSpy = vi
      .spyOn(extractor, 'openEntryStream')
      .mockImplementation(async (zipFile, entry): Promise<Readable> => {
        if (entry.fileName === 'files/foto.webp') {
          const stream: PassThrough = new PassThrough();

          queueMicrotask((): void => {
            stream.destroy(extractionError);
          });

          return stream;
        }

        return originalOpenEntryStream(zipFile, entry);
      });

    try {
      await expect(extractor.extract(payloadFile, destinationDirectory)).rejects.toBe(
        extractionError,
      );

      expect(removedFiles).toHaveLength(1);
      expect(removedFiles[0]).toMatch(/\.restore-[0-9a-f-]+\.tmp$/i);

      expect(logger.warnEvents).toEqual([
        {
          area: 'backup',
          operation: 'restore-files-entry-temp-cleanup',
          message: 'No se ha podido limpiar un archivo temporal de la restauración.',
          error: cleanupError,
        },
      ]);

      expect(logger.warnEvents[0].context).toBeUndefined();
    } finally {
      streamSpy.mockRestore();
    }
  });
});

/**
 * Construye los recursos obligatorios
 * requeridos por el formato v3.
 */
function createRequiredEntries(): readonly PayloadEntry[] {
  return [
    {
      path: 'database/osumi-tpv.sqlite',
      content: 'database',
    },
    {
      path: 'config/app_data.json',
      content: '{}',
    },
    {
      path: 'assets/logo.webp',
      content: 'logo',
    },
    {
      path: 'secrets/secrets.json',
      content: '{}',
    },
  ];
}

/**
 * Genera un ZIP interior para el test.
 */
async function writePayload(payloadFile: string, entries: readonly PayloadEntry[]): Promise<void> {
  const zipFile: ZipFile = new ZipFile();

  for (const entry of entries) {
    zipFile.addBuffer(toBuffer(entry.content), entry.path);
  }

  const writePromise: Promise<void> = pipeline(
    zipFile.outputStream,
    createWriteStream(payloadFile),
  );

  zipFile.end();

  await writePromise;
}

/**
 * Convierte el fixture a Buffer.
 */
function toBuffer(content: Buffer | string): Buffer {
  return Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
}

/**
 * Devuelve una ruta temporal.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return join(tempDirectory, fileName);
}

/**
 * Logger de pruebas que conserva
 * las incidencias recuperables.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora mensajes de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora mensajes informativos.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos para comprobarlos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores de otros niveles.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}
