import type OtpvV3PayloadInspection from '@backend/domain/backup/otpv-v3-payload-inspection.interface';
import YauzlOtpvV3PayloadInspector from '@infrastructure/backup/yauzl-otpv-v3-payload.inspector';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

describe('YauzlOtpvV3PayloadInspector', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-payload-inspector-'));
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

  it('valida completamente un ZIP interior correcto', async (): Promise<void> => {
    const payloadFile: string = getPath('payload.zip');

    const entries: readonly PayloadEntry[] = [
      {
        path: 'database/osumi-tpv.sqlite',
        content: Buffer.from('sqlite-fixture', 'utf8'),
      },
      {
        path: 'config/app_data.json',
        content: '{}\n',
      },
      {
        path: 'assets/logo.webp',
        content: Buffer.from('logo-fixture', 'utf8'),
      },
      {
        path: 'secrets/secrets.json',
        content: '{}\n',
      },
      {
        path: 'files/pedidos/factura.pdf',
        content: Buffer.from('pdf-fixture', 'utf8'),
      },
    ];

    await writePayload(payloadFile, entries);

    const inspector: YauzlOtpvV3PayloadInspector = new YauzlOtpvV3PayloadInspector();

    const result: OtpvV3PayloadInspection = await inspector.inspect(payloadFile);

    expect(result.regularFileCount).toBe(5);
    expect(result.entries).toHaveLength(5);

    expect(result.totalUncompressedSize).toBe(
      entries.reduce(
        (total: number, entry: PayloadEntry): number => total + toBuffer(entry.content).length,
        0,
      ),
    );
  });

  it('rechaza un payload sin todos los ficheros obligatorios', async (): Promise<void> => {
    const payloadFile: string = getPath('incomplete.zip');

    await writePayload(payloadFile, [
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
    ]);

    const inspector: YauzlOtpvV3PayloadInspector = new YauzlOtpvV3PayloadInspector();

    await expect(inspector.inspect(payloadFile)).rejects.toThrow(
      'Falta el archivo obligatorio secrets/secrets.json.',
    );
  });

  it('rechaza una raíz no permitida', async (): Promise<void> => {
    const payloadFile: string = getPath('unknown-root.zip');

    await writePayload(payloadFile, [
      ...createRequiredEntries(),
      {
        path: 'unknown/private.txt',
        content: 'no-admitido',
      },
    ]);

    const inspector: YauzlOtpvV3PayloadInspector = new YauzlOtpvV3PayloadInspector();

    await expect(inspector.inspect(payloadFile)).rejects.toThrow(
      'no pertenece a una raíz permitida',
    );
  });

  it('rechaza un fichero que no contiene un ZIP', async (): Promise<void> => {
    const payloadFile: string = getPath('invalid.zip');

    await writeFile(payloadFile, 'esto no es un zip', {
      encoding: 'utf8',
    });

    const inspector: YauzlOtpvV3PayloadInspector = new YauzlOtpvV3PayloadInspector();

    await expect(inspector.inspect(payloadFile)).rejects.toThrow('no contiene un ZIP válido');
  });
});

/**
 * Construye los cuatro ficheros obligatorios
 * de un payload v3.
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
 * Escribe un ZIP interior de prueba.
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
 * Normaliza el contenido de una entrada.
 */
function toBuffer(content: Buffer | string): Buffer {
  return Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
}

/**
 * Construye una ruta dentro del directorio temporal.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return join(tempDirectory, fileName);
}
