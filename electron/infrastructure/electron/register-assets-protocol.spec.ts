import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import registerAssetsProtocol from '@infrastructure/electron/register-assets-protocol';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ProtocolHandler = (request: Request) => Promise<Response>;

const electronMocks = vi.hoisted(() => ({
  handle: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('electron', (): object => ({
  protocol: {
    handle: electronMocks.handle,
  },
  net: {
    fetch: electronMocks.fetch,
  },
}));

let tempDirectory: string | null = null;
let applicationPaths: ApplicationPaths;
let applicationAssetsDirectory: string;
let applicationLogger: TestApplicationLogger;
let protocolHandler: ProtocolHandler | null = null;

describe('registerAssetsProtocol', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-assets-protocol-'));

    applicationPaths = createApplicationPaths(tempDirectory);
    applicationAssetsDirectory = join(tempDirectory, 'renderer-assets');
    applicationLogger = new TestApplicationLogger();
    protocolHandler = null;

    await Promise.all([
      mkdir(applicationPaths.filesDirectory, {
        recursive: true,
      }),
      mkdir(applicationPaths.stagingFilesDirectory, {
        recursive: true,
      }),
      mkdir(applicationAssetsDirectory, {
        recursive: true,
      }),
    ]);

    electronMocks.handle.mockReset();
    electronMocks.fetch.mockReset();

    electronMocks.handle.mockImplementation((scheme: string, handler: ProtocolHandler): void => {
      expect(scheme).toBe('osumi');

      protocolHandler = handler;
    });

    electronMocks.fetch.mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );

    registerAssetsProtocol(applicationPaths, applicationAssetsDirectory, applicationLogger);
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
    protocolHandler = null;
  });

  it('sirve un archivo administrado existente', async (): Promise<void> => {
    const filePath: string = join(applicationPaths.filesDirectory, 'articles', 'photo.webp');

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, Buffer.from('asset'));

    const response: Response = await requireProtocolHandler()(
      new Request('osumi://assets/files/articles/photo.webp'),
    );

    expect(response.status).toBe(200);

    const realFilePath: string = await realpath(filePath);

    expect(electronMocks.fetch).toHaveBeenCalledWith(pathToFileURL(realFilePath).toString());
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('devuelve 404 sin incidencia cuando el asset solicitado no existe', async (): Promise<void> => {
    const response: Response = await requireProtocolHandler()(
      new Request('osumi://assets/files/articles/missing.webp'),
    );

    expect(response.status).toBe(404);
    expect(electronMocks.fetch).not.toHaveBeenCalled();
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza una ruta ajena al almacenamiento administrado sin registrar incidencia', async (): Promise<void> => {
    const response: Response = await requireProtocolHandler()(
      new Request('osumi://assets/files/%2E%2E%2Foutside.webp'),
    );

    expect(response.status).toBe(404);
    expect(electronMocks.fetch).not.toHaveBeenCalled();
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra un fallo técnico cuando desaparece el directorio administrado', async (): Promise<void> => {
    await rm(applicationAssetsDirectory, {
      recursive: true,
      force: true,
    });

    const response: Response = await requireProtocolHandler()(
      new Request('osumi://assets/app/icon.svg'),
    );

    expect(response.status).toBe(404);
    expect(electronMocks.fetch).not.toHaveBeenCalled();

    expect(applicationLogger.warnEvents).toHaveLength(1);

    expect(applicationLogger.warnEvents[0]).toMatchObject({
      area: 'files',
      operation: 'serve-local-asset',
      message: 'No se ha podido resolver o servir un asset local.',
      error: expect.objectContaining({
        message: 'No se ha podido resolver el directorio administrado de assets.',
      }),
    });
  });

  it('registra una única incidencia cuando Electron no puede servir un archivo existente', async (): Promise<void> => {
    const filePath: string = join(applicationPaths.filesDirectory, 'articles', 'photo.webp');

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, Buffer.from('asset'));

    const error: Error = new Error('No se ha podido servir el archivo.');

    electronMocks.fetch.mockRejectedValue(error);

    const response: Response = await requireProtocolHandler()(
      new Request('osumi://assets/files/articles/photo.webp'),
    );

    expect(response.status).toBe(404);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'files',
        operation: 'serve-local-asset',
        message: 'No se ha podido resolver o servir un asset local.',
        error,
      },
    ]);
  });
});

/**
 * Devuelve el handler registrado por el protocolo.
 */
function requireProtocolHandler(): ProtocolHandler {
  if (protocolHandler === null) {
    throw new Error('El protocolo de test no contiene handler.');
  }

  return protocolHandler;
}

/**
 * Construye las rutas mínimas de aplicación
 * utilizadas durante las pruebas.
 */
function createApplicationPaths(rootDirectory: string): ApplicationPaths {
  const configDirectory: string = join(rootDirectory, 'config');
  const assetsDirectory: string = join(rootDirectory, 'assets');
  const filesDirectory: string = join(rootDirectory, 'files');
  const databaseDirectory: string = join(rootDirectory, 'database');
  const backupsDirectory: string = join(rootDirectory, 'backups');
  const logsDirectory: string = join(rootDirectory, 'logs');
  const secretsDirectory: string = join(rootDirectory, 'secrets');
  const stagingDirectory: string = join(rootDirectory, 'staging');
  const stagingFilesDirectory: string = join(stagingDirectory, 'files');

  return {
    rootDirectory,
    configDirectory,
    assetsDirectory,
    filesDirectory,
    databaseDirectory,
    backupsDirectory,
    logsDirectory,
    secretsDirectory,
    stagingDirectory,
    stagingFilesDirectory,

    appDataFile: join(configDirectory, 'app_data.json'),
    printingSettingsFile: join(configDirectory, 'printing_settings.json'),
    backupAutomaticStateFile: join(configDirectory, 'backup_automatic_state.json'),
    logoFile: join(assetsDirectory, 'logo.webp'),
    databaseFile: join(databaseDirectory, 'osumi-tpv.sqlite'),
    secretsFile: join(secretsDirectory, 'secrets.json'),
    backupRemoteCredentialsFile: join(secretsDirectory, 'backup_remote_credentials.json'),

    stagingAppDataFile: join(stagingDirectory, 'app_data.json'),
    stagingLogoFile: join(stagingDirectory, 'logo.webp'),
    stagingSecretsFile: join(stagingDirectory, 'secrets.json'),
    stagingDatabaseFile: join(stagingDirectory, 'osumi-tpv.sqlite'),
  };
}

/**
 * Logger controlado utilizado por las pruebas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva avisos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores porque este protocolo
   * solo utiliza severidad warn.
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
