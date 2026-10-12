import type BackupRemoteRestoreSelectionService from '@backend/application/backup/backup-remote-restore-selection.service';
import BackupRemoteRestoreSessionService from '@backend/application/backup/backup-remote-restore-session.service';
import type BackupRemoteService from '@backend/application/backup/backup-remote.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
} from '@desktop-contracts/backup/backup-remote.interface';
import { describe, expect, it } from 'vitest';

type RemoteRestoreService = Pick<BackupRemoteService, 'removeConfiguration' | 'configure' | 'list'>;

type RemoteRestoreSelectionCleaner = Pick<BackupRemoteRestoreSelectionService, 'clear'>;

const CONNECTION: BackupRemoteConnection = {
  expiresAt: 1_800_000_000,
  installation: {
    publicId: 'installation-1',
    name: 'TPV Principal',
  },
  subscription: {
    publicId: 'subscription-1',
    name: 'TPV Backup',
    status: 'active',
  },
  canUpload: true,
};

const BACKUPS: readonly BackupRemoteBackup[] = [
  {
    publicId: 'backup-1',
    backupId: '11111111-1111-4111-8111-111111111111',
    createdAtClient: '2026-10-12T10:00:00.000Z',
    formatVersion: 3,
    applicationVersion: '1.0.0',
    databaseSchemaVersion: 1,
    originalFilename: 'backup.otpv',
    sizeBytes: 4096,
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    createdAt: '2026-10-12T10:01:00.000Z',
  },
];

describe('BackupRemoteRestoreSessionService', (): void => {
  it('invalida la sesión anterior y devuelve la conexión con sus copias', async (): Promise<void> => {
    const remoteService = new TestRemoteRestoreService();
    const cleaner = new TestRemoteRestoreSelectionCleaner();
    const applicationLogger = new TestApplicationLogger();

    const service = new BackupRemoteRestoreSessionService(
      remoteService,
      cleaner,
      applicationLogger,
    );

    const credentials = {
      keyId: 'key-id',
      secret: 'secret',
    };

    await expect(service.connect(credentials)).resolves.toEqual({
      connection: CONNECTION,
      backups: BACKUPS,
    });

    expect(remoteService.removeConfigurationCalls).toBe(1);
    expect(remoteService.receivedCredentials).toEqual([credentials]);
    expect(remoteService.listCalls).toBe(1);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('conserva el fallo principal de conexión si también falla la limpieza de credenciales', async (): Promise<void> => {
    const remoteService = new TestRemoteRestoreService();
    const applicationLogger = new TestApplicationLogger();

    const listError: Error = new Error('No se han podido recuperar las copias.');
    const cleanupError: Error = new Error('No se han podido limpiar las credenciales.');

    remoteService.listError = listError;
    remoteService.removeConfigurationErrors.set(2, cleanupError);

    const service = new BackupRemoteRestoreSessionService(
      remoteService,
      new TestRemoteRestoreSelectionCleaner(),
      applicationLogger,
    );

    await expect(
      service.connect({
        keyId: 'key-id',
        secret: 'secret',
      }),
    ).rejects.toBe(listError);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'cleanup-remote-restore-credentials-after-connect-error',
        message:
          'No se han podido limpiar las credenciales temporales después de fallar la conexión de restauración.',
        error: cleanupError,
      },
    ]);
  });

  it('conserva el fallo de selección al desconectar aunque también falle la limpieza de credenciales', async (): Promise<void> => {
    const remoteService = new TestRemoteRestoreService();
    const cleaner = new TestRemoteRestoreSelectionCleaner();
    const applicationLogger = new TestApplicationLogger();

    const selectionError: Error = new Error('No se ha podido limpiar el paquete.');
    const cleanupError: Error = new Error('No se han podido limpiar las credenciales.');

    cleaner.clearError = selectionError;
    remoteService.removeConfigurationErrors.set(1, cleanupError);

    const service = new BackupRemoteRestoreSessionService(
      remoteService,
      cleaner,
      applicationLogger,
    );

    await expect(service.disconnect()).rejects.toBe(selectionError);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'cleanup-remote-restore-credentials-after-disconnect-error',
        message:
          'No se han podido limpiar las credenciales temporales después de fallar el cierre de la restauración remota.',
        error: cleanupError,
      },
    ]);
  });

  it('propaga directamente el fallo de credenciales cuando la selección se limpia correctamente', async (): Promise<void> => {
    const remoteService = new TestRemoteRestoreService();
    const applicationLogger = new TestApplicationLogger();
    const cleanupError: Error = new Error('No se han podido limpiar las credenciales.');

    remoteService.removeConfigurationErrors.set(1, cleanupError);

    const service = new BackupRemoteRestoreSessionService(
      remoteService,
      new TestRemoteRestoreSelectionCleaner(),
      applicationLogger,
    );

    await expect(service.disconnect()).rejects.toBe(cleanupError);

    expect(applicationLogger.warnEvents).toEqual([]);
  });
});

/**
 * Servicio remoto controlado para las pruebas.
 */
class TestRemoteRestoreService implements RemoteRestoreService {
  readonly removeConfigurationErrors: Map<number, Error> = new Map<number, Error>();
  readonly receivedCredentials: unknown[] = [];

  removeConfigurationCalls: number = 0;
  listCalls: number = 0;
  listError: Error | null = null;

  /**
   * Elimina la sesión o produce el fallo
   * configurado para la llamada actual.
   */
  async removeConfiguration(): Promise<void> {
    this.removeConfigurationCalls++;

    const error: Error | undefined = this.removeConfigurationErrors.get(
      this.removeConfigurationCalls,
    );

    if (error !== undefined) {
      throw error;
    }
  }

  /**
   * Conserva las credenciales y devuelve
   * una conexión remota simulada.
   */
  async configure(value: unknown): Promise<BackupRemoteConnection> {
    this.receivedCredentials.push(value);

    return CONNECTION;
  }

  /**
   * Devuelve las copias simuladas o el
   * fallo configurado para la prueba.
   */
  async list(): Promise<readonly BackupRemoteBackup[]> {
    this.listCalls++;

    if (this.listError !== null) {
      throw this.listError;
    }

    return BACKUPS;
  }
}

/**
 * Limpieza de selección remota controlada.
 */
class TestRemoteRestoreSelectionCleaner implements RemoteRestoreSelectionCleaner {
  clearError: Error | null = null;

  /**
   * Limpia la selección o produce
   * el fallo configurado.
   */
  async clear(): Promise<void> {
    if (this.clearError !== null) {
      throw this.clearError;
    }
  }
}

/**
 * Logger controlado para las pruebas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora información.
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
   * Ignora errores.
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
