import BackupRemoteRestoreSelectionService from '@backend/application/backup/backup-remote-restore-selection.service';
import type BackupRemoteDownloader from '@backend/contracts/backup/backup-remote-downloader.interface';
import type BackupRestorePackageSelector from '@backend/contracts/backup/backup-restore-package-selector.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type { BackupRemoteDownloadResult } from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type NativeRestoreSelection = Extract<
  BackupRestorePackageSelectionResult,
  {
    readonly status: 'selected';
    readonly mode: 'native-restore';
  }
>;

const BACKUP_ID: string = '11111111-1111-4111-8111-111111111111';

let tempDirectory: string | null = null;

describe('BackupRemoteRestoreSelectionService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-remote-restore-selection-'));
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

  it('entrega la copia descargada al selector nativo', async (): Promise<void> => {
    const downloader = new TestRemoteDownloader();
    const selector = new TestPackageSelector();
    const applicationLogger = new TestApplicationLogger();

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      downloader,
      selector,
      applicationLogger,
    );

    const result = await service.select('backup-public-id');

    expect(downloader.publicIds).toEqual(['backup-public-id']);
    expect(selector.packagePath).toBe(join(requireTempDirectory(), 'downloaded.otpv'));
    expect(selector.fileName).toBe('original.otpv');
    expect(result).toMatchObject({
      status: 'selected',
      mode: 'native-restore',
      backupId: BACKUP_ID,
    });
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra una selección cuyo backupId no coincide', async (): Promise<void> => {
    const selector = new TestPackageSelector();
    const downloader = new TestRemoteDownloader();
    const applicationLogger = new TestApplicationLogger();

    selector.result = {
      ...createSelection(),
      backupId: '22222222-2222-4222-8222-222222222222',
    };

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      downloader,
      selector,
      applicationLogger,
    );

    await expect(service.select('backup-public-id')).rejects.toMatchObject({
      kind: 'invalid-backup',
    });

    expect(applicationLogger.warnEvents).toHaveLength(1);

    expect(applicationLogger.warnEvents[0]).toMatchObject({
      area: 'backup',
      operation: 'validate-remote-restore-package',
      message:
        'La copia remota preparada no coincide con los metadatos esperados para la restauración.',
      error: expect.objectContaining({
        kind: 'invalid-backup',
      }),
    });
  });

  it('registra un fallo al descargar la copia para restauración', async (): Promise<void> => {
    const downloader = new TestRemoteDownloader();
    const applicationLogger = new TestApplicationLogger();

    const error: Error = new Error('TPV Backup no está disponible.');

    downloader.error = error;

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      downloader,
      new TestPackageSelector(),
      applicationLogger,
    );

    await expect(service.select('backup-public-id')).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'download-remote-restore-package',
        message: 'No se ha podido descargar la copia remota para preparar su restauración.',
        error,
      },
    ]);
  });

  it('no duplica el fallo registrado por el selector de paquetes', async (): Promise<void> => {
    const selector = new TestPackageSelector();
    const applicationLogger = new TestApplicationLogger();

    const error: Error = new Error('El paquete OTPV no es válido.');

    selector.error = error;

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      new TestRemoteDownloader(),
      selector,
      applicationLogger,
    );

    await expect(service.select('backup-public-id')).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra un fallo al limpiar el área temporal antes de seleccionar', async (): Promise<void> => {
    const applicationLogger = new TestApplicationLogger();
    const cleanupError: Error = new Error('No se ha podido limpiar el directorio.');

    const service = new InitialCleanupFailingBackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      new TestRemoteDownloader(),
      new TestPackageSelector(),
      applicationLogger,
      cleanupError,
    );

    await expect(service.select('backup-public-id')).rejects.toBe(cleanupError);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'prepare-remote-restore-directory',
        message:
          'No se ha podido limpiar el área temporal antes de preparar una restauración remota.',
        error: cleanupError,
      },
    ]);
  });

  it('registra un fallo de limpieza sin ocultar el error principal', async (): Promise<void> => {
    const selector = new TestPackageSelector();
    const applicationLogger = new TestApplicationLogger();
    const cleanupError: Error = new Error('No se ha podido eliminar el temporal.');

    selector.result = {
      ...createSelection(),
      backupId: '22222222-2222-4222-8222-222222222222',
    };

    const service = new CleanupFailingBackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      new TestRemoteDownloader(),
      selector,
      applicationLogger,
      cleanupError,
    );

    await expect(service.select('backup-public-id')).rejects.toMatchObject({
      kind: 'invalid-backup',
    });

    expect(applicationLogger.warnEvents).toHaveLength(2);

    expect(applicationLogger.warnEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'backup',
          operation: 'validate-remote-restore-package',
          message:
            'La copia remota preparada no coincide con los metadatos esperados para la restauración.',
        }),
        {
          area: 'backup',
          operation: 'cleanup-remote-restore-package',
          message: 'No se ha podido limpiar el paquete temporal de restauración remota.',
          error: cleanupError,
        },
      ]),
    );
  });
});

/**
 * Downloader remoto controlado.
 */
class TestRemoteDownloader implements BackupRemoteDownloader {
  readonly publicIds: unknown[] = [];
  error: Error | null = null;

  /**
   * Devuelve una descarga remota simulada
   * o el fallo configurado para la prueba.
   */
  async download(value: unknown): Promise<BackupRemoteDownloadResult> {
    this.publicIds.push(value);

    if (this.error !== null) {
      throw this.error;
    }

    return {
      publicId: 'backup-public-id',
      backupId: BACKUP_ID,
      originalFilename: 'original.otpv',
      fileName: 'downloaded.otpv',
      sizeBytes: 4096,
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  }
}

/**
 * Selector de paquetes controlado.
 */
class TestPackageSelector implements BackupRestorePackageSelector {
  packagePath: string | null = null;
  fileName: string | null = null;
  result: BackupRestorePackageSelectionResult = createSelection();
  error: Error | null = null;

  /**
   * Registra los datos recibidos y devuelve
   * la selección o el fallo configurado.
   */
  async selectPackagePath(
    packagePath: string,
    fileName?: string,
  ): Promise<BackupRestorePackageSelectionResult> {
    this.packagePath = packagePath;
    this.fileName = fileName ?? null;

    if (this.error !== null) {
      throw this.error;
    }

    return this.result;
  }
}

/**
 * Construye una selección nativa válida.
 */
function createSelection(): NativeRestoreSelection {
  return {
    status: 'selected',
    mode: 'native-restore',
    selectionId: 'selection-id',
    formatVersion: 3,
    fileName: 'original.otpv',
    backupId: BACKUP_ID,
    applicationVersion: '1.0.0',
    databaseSchemaVersion: 1,
    createdAt: '2026-10-06T12:00:00.000Z',
  };
}

/**
 * Devuelve el directorio temporal del test.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}

/**
 * Variante del servicio que permite simular
 * un fallo únicamente durante la limpieza secundaria.
 */
class CleanupFailingBackupRemoteRestoreSelectionService extends BackupRemoteRestoreSelectionService {
  private clearCalls: number = 0;

  /**
   * Crea el servicio con el error de limpieza
   * que debe simular la prueba.
   */
  constructor(
    downloadDirectory: string,
    remoteDownloader: BackupRemoteDownloader,
    packageSelector: BackupRestorePackageSelector,
    applicationLogger: ApplicationLogger,
    private readonly cleanupError: Error,
  ) {
    super(downloadDirectory, remoteDownloader, packageSelector, applicationLogger);
  }

  /**
   * Permite la limpieza inicial y falla en la
   * limpieza secundaria posterior al error principal.
   */
  override clear(): Promise<void> {
    this.clearCalls++;

    if (this.clearCalls > 1) {
      return Promise.reject(this.cleanupError);
    }

    return Promise.resolve();
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de restauración remota.
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
   * Conserva los avisos recibidos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No existen escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Variante del servicio que falla únicamente durante
 * la limpieza inicial y permite la recuperación posterior.
 */
class InitialCleanupFailingBackupRemoteRestoreSelectionService extends BackupRemoteRestoreSelectionService {
  private clearCalls: number = 0;

  /**
   * Crea el servicio con el fallo que debe producir
   * la primera limpieza del directorio temporal.
   */
  constructor(
    downloadDirectory: string,
    remoteDownloader: BackupRemoteDownloader,
    packageSelector: BackupRestorePackageSelector,
    applicationLogger: ApplicationLogger,
    private readonly cleanupError: Error,
  ) {
    super(downloadDirectory, remoteDownloader, packageSelector, applicationLogger);
  }

  /**
   * Falla en la primera limpieza y permite que
   * la limpieza de recuperación posterior termine.
   */
  override clear(): Promise<void> {
    this.clearCalls++;

    if (this.clearCalls === 1) {
      return Promise.reject(this.cleanupError);
    }

    return Promise.resolve();
  }
}
