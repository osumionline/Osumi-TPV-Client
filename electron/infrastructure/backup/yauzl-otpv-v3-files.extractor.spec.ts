import YauzlOtpvV3FilesExtractor from '@infrastructure/backup/yauzl-otpv-v3-files.extractor';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

    const extractor = new YauzlOtpvV3FilesExtractor();

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

    const extractor = new YauzlOtpvV3FilesExtractor();

    await extractor.extract(payloadFile, destinationDirectory);

    expect(await readdir(destinationDirectory)).toEqual([]);
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
