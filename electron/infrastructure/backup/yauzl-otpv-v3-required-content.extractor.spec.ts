import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import { OTPV_V3_MAX_APP_DATA_SIZE_BYTES } from '@backend/domain/backup/otpv-v3.constants';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import YauzlOtpvV3RequiredContentExtractor from '@infrastructure/backup/yauzl-otpv-v3-required-content.extractor';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

describe('YauzlOtpvV3RequiredContentExtractor', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-required-content-'));
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

  it('extrae exactamente los cuatro recursos obligatorios', async (): Promise<void> => {
    const payloadFile: string = getPath('payload.zip');
    const destinations: OtpvV3RequiredContentPaths = createDestinations();

    const database: Buffer = Buffer.from('sqlite-fixture', 'utf8');

    const appData: string = '{"schemaVersion":1}\n';
    const logo: Buffer = Buffer.from('webp-fixture', 'utf8');
    const secrets: string =
      '{"schemaVersion":1,"secretApi":"secret","emailSmtpPass":null,"ticketBaiToken":null}\n';

    await writePayload(payloadFile, [
      {
        path: 'database/osumi-tpv.sqlite',
        content: database,
      },
      {
        path: 'config/app_data.json',
        content: appData,
      },
      {
        path: 'assets/logo.webp',
        content: logo,
      },
      {
        path: 'secrets/secrets.json',
        content: secrets,
      },
      {
        path: 'files/documentos/factura.pdf',
        content: 'archivo-adicional',
      },
    ]);

    const extractor = new YauzlOtpvV3RequiredContentExtractor(new TestApplicationLogger());

    await extractor.extract(payloadFile, destinations);

    expect(await readFile(destinations.databaseFile)).toEqual(database);

    expect(
      await readFile(destinations.appDataFile, {
        encoding: 'utf8',
      }),
    ).toBe(appData);

    expect(await readFile(destinations.logoFile)).toEqual(logo);

    expect(
      await readFile(destinations.portableSecretsFile, {
        encoding: 'utf8',
      }),
    ).toBe(secrets);
  });

  it('rechaza un payload sin uno de los recursos obligatorios', async (): Promise<void> => {
    const payloadFile: string = getPath('missing-secrets.zip');

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

    const extractor = new YauzlOtpvV3RequiredContentExtractor(new TestApplicationLogger());

    await expect(extractor.extract(payloadFile, createDestinations())).rejects.toThrow(
      'Falta el archivo obligatorio secrets/secrets.json.',
    );
  });

  it('aplica el límite específico de app_data.json', async (): Promise<void> => {
    const payloadFile: string = getPath('large-app-data.zip');

    await writePayload(payloadFile, [
      {
        path: 'database/osumi-tpv.sqlite',
        content: 'database',
      },
      {
        path: 'config/app_data.json',
        content: Buffer.alloc(OTPV_V3_MAX_APP_DATA_SIZE_BYTES + 1, 0x61),
      },
      {
        path: 'assets/logo.webp',
        content: 'logo',
      },
      {
        path: 'secrets/secrets.json',
        content: '{}',
      },
    ]);

    const extractor = new YauzlOtpvV3RequiredContentExtractor(new TestApplicationLogger());

    await expect(extractor.extract(payloadFile, createDestinations())).rejects.toThrow(
      'config/app_data.json tiene un tamaño no permitido.',
    );
  });

  it('registra fallos de cleanup sin propagarlos ni exponer rutas', async (): Promise<void> => {
    const logger: TestApplicationLogger = new TestApplicationLogger();
    const cleanupError: Error = new Error('Fallo simulado eliminando temporal.');
    const temporaryFile: string = getPath('.restore-test.tmp');

    const removeTemporaryFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      expect(filePath).toBe(temporaryFile);
      expect(options.force).toBe(true);

      throw cleanupError;
    };

    const extractor = new YauzlOtpvV3RequiredContentExtractor(logger, removeTemporaryFile);

    await expect(extractor['removeTemporaryFileSafely'](temporaryFile)).resolves.toBeUndefined();

    expect(logger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'restore-required-content-temp-cleanup',
        message: 'No se ha podido limpiar un recurso obligatorio temporal de restauración.',
        error: cleanupError,
      },
    ]);

    expect(logger.warnEvents[0].context).toBeUndefined();
  });
});

/**
 * Construye las rutas físicas de extracción
 * utilizadas por cada test.
 */
function createDestinations(): OtpvV3RequiredContentPaths {
  const baseDirectory: string = getPath('required');

  return {
    databaseFile: join(baseDirectory, 'database', 'osumi-tpv.sqlite'),

    appDataFile: join(baseDirectory, 'config', 'app_data.json'),

    logoFile: join(baseDirectory, 'assets', 'logo.webp'),

    portableSecretsFile: join(baseDirectory, 'secrets', 'secrets.json'),
  };
}

/**
 * Genera un ZIP interior con las entradas indicadas.
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
 * Convierte el contenido de prueba a Buffer.
 */
function toBuffer(content: Buffer | string): Buffer {
  return Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
}

/**
 * Devuelve una ruta dentro del directorio
 * temporal del test.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
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
   * Ignora eventos de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora eventos informativos.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos.
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
