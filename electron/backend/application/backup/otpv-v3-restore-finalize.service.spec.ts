import OtpvV3RestoreFinalizeService from '@backend/application/backup/otpv-v3-restore-finalize.service';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type PrintingSettings from '@desktop-contracts/configuration/printing/printing-settings.interface';
import InMemoryOtpvV3PreparedRestoreStore from '@infrastructure/backup/in-memory-otpv-v3-prepared-restore.store';
import InMemoryOtpvV3RestoreSelectionStore from '@infrastructure/backup/in-memory-otpv-v3-restore-selection.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const REMOTE_CREDENTIALS: BackupRemoteCredentials = {
  keyId: 'remote-key-id',
  secret: 'remote-secret',
};
let applicationLogger: TestApplicationLogger;

describe('OtpvV3RestoreFinalizeService', (): void => {
  beforeEach((): void => {
    applicationLogger = new TestApplicationLogger();
  });

  it('promueve la restauración preparada e invalida su estado', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId,
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const appDataRepository = new TestAppDataRepository();

    const printingSettingsRepository = new TestPrintingSettingsRepository();

    const finalizer = new TestInstallationFinalizer();

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      appDataRepository,
      printingSettingsRepository,
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    const result: BackupRestoreFinalizeResult = await service.finalize(selectionId);

    expect(backupRemoteCredentialStorage.value).toEqual(REMOTE_CREDENTIALS);
    expect(backupRemoteCredentialStorage.saveCalls).toBe(1);
    expect(backupRemoteCredentialStorage.deleteCalls).toBe(0);

    expect(result).toEqual({
      status: 'installed',
      selectionId,
      backupId: manifest.backupId,
    });

    expect(finalizer.finalizeCalls).toBe(1);
    expect(finalizer.recoverCalls).toBe(0);

    expect(printingSettingsRepository.savedSettings).toEqual({
      schemaVersion: 1,
      ticketPrinterDeviceName: null,
    });

    expect(selectionStore.resolve(selectionId)).toBeNull();
    expect(preparedStore.resolve()).toBeNull();
    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza una selección cuyo staging no está preparado', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const finalizer = new TestInstallationFinalizer();

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      new InMemoryOtpvV3PreparedRestoreStore(),
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'no tiene una restauración preparada',
    );

    expect(finalizer.finalizeCalls).toBe(0);
    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza un staging preparado para otra selección', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId: 'otra-seleccion',
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const finalizer = new TestInstallationFinalizer();

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'no tiene una restauración preparada',
    );

    expect(finalizer.finalizeCalls).toBe(0);
    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('impide restaurar sobre una instalación ya configurada', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId,
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const appDataRepository = new TestAppDataRepository();

    appDataRepository.installed = true;

    const finalizer = new TestInstallationFinalizer();

    const printingSettingsRepository = new TestPrintingSettingsRepository();

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      appDataRepository,
      printingSettingsRepository,
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow('instalación ya configurada');

    expect(finalizer.finalizeCalls).toBe(0);
    expect(printingSettingsRepository.savedSettings).toBeNull();
    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('recupera una promoción fallida e invalida el staging preparado', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId,
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const finalizer = new TestInstallationFinalizer();

    finalizer.finalizeError = new Error('Falló una promoción.');

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'No se ha podido completar la restauración',
    );

    expect(backupRemoteCredentialStorage.saveCalls).toBe(1);
    expect(backupRemoteCredentialStorage.deleteCalls).toBe(1);
    expect(backupRemoteCredentialStorage.value).toBeNull();

    expect(finalizer.finalizeCalls).toBe(1);
    expect(finalizer.recoverCalls).toBe(1);

    expect(preparedStore.resolve()).toBeNull();

    /*
     * La selección se conserva para permitir
     * volver a desbloquear la misma copia.
     */
    expect(selectionStore.resolve(selectionId)).not.toBeNull();
    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'backup',
        operation: 'finalize-restore',
        message: 'No se ha podido completar la restauración de la copia de seguridad.',
        error: finalizer.finalizeError,
      },
    ]);

    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra los fallos secundarios de recuperación sin ocultar el error original', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId,
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const finalizeError: Error = new Error('Falló una promoción.');
    const credentialsCleanupError: Error = new Error('No se han podido eliminar las credenciales.');
    const recoveryError: Error = new Error('No se ha podido recuperar la instalación.');

    const finalizer = new TestInstallationFinalizer();

    finalizer.finalizeError = finalizeError;
    finalizer.recoverError = recoveryError;

    const backupRemoteCredentialStorage = new TestBackupRemoteCredentialStorage();

    backupRemoteCredentialStorage.deleteError = credentialsCleanupError;

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      backupRemoteCredentialStorage,
      finalizer,
      applicationLogger,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'No se ha podido completar la restauración',
    );

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'backup',
        operation: 'finalize-restore',
        message: 'No se ha podido completar la restauración de la copia de seguridad.',
        error: finalizeError,
      },
    ]);

    expect(applicationLogger.warnEvents).toHaveLength(2);

    expect(applicationLogger.warnEvents).toEqual(
      expect.arrayContaining([
        {
          area: 'backup',
          operation: 'restore-remote-credentials-cleanup',
          message:
            'No se han podido limpiar las credenciales de TPV Backup después de fallar una restauración.',
          error: credentialsCleanupError,
        },
        {
          area: 'backup',
          operation: 'recover-incomplete-restore',
          message: 'No se ha podido recuperar completamente una restauración fallida.',
          error: recoveryError,
        },
      ]),
    );
  });

  it('conserva la instalación completada si falla la limpieza del estado temporal', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();
    const preparedStore = new InMemoryOtpvV3PreparedRestoreStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    preparedStore.save({
      selectionId,
      backupId: manifest.backupId,
      backupRemoteCredentials: REMOTE_CREDENTIALS,
    });

    const cleanupError: Error = new Error('Fallo simulado limpiando estado preparado.');

    const clearPreparedSpy = vi.spyOn(preparedStore, 'clear').mockImplementationOnce((): never => {
      throw cleanupError;
    });

    const clearSelectionSpy = vi.spyOn(selectionStore, 'clear');

    try {
      const finalizer = new TestInstallationFinalizer();
      const credentials = new TestBackupRemoteCredentialStorage();

      const service = new OtpvV3RestoreFinalizeService(
        selectionStore,
        preparedStore,
        new TestAppDataRepository(),
        new TestPrintingSettingsRepository(),
        credentials,
        finalizer,
        applicationLogger,
      );

      await expect(service.finalize(selectionId)).resolves.toEqual({
        status: 'installed',
        selectionId,
        backupId: manifest.backupId,
      });

      expect(finalizer.finalizeCalls).toBe(1);
      expect(finalizer.recoverCalls).toBe(0);

      expect(credentials.value).toEqual(REMOTE_CREDENTIALS);
      expect(credentials.deleteCalls).toBe(0);

      expect(clearPreparedSpy).toHaveBeenCalledTimes(1);
      expect(clearSelectionSpy).toHaveBeenCalledTimes(1);

      expect(applicationLogger.errorEvents).toEqual([]);

      expect(applicationLogger.warnEvents).toEqual([
        {
          area: 'backup',
          operation: 'completed-restore-prepared-state-cleanup',
          message: 'No se ha podido invalidar el estado temporal de la restauración completada.',
          error: cleanupError,
        },
      ]);

      expect(applicationLogger.warnEvents[0].context).toBeUndefined();
    } finally {
      clearPreparedSpy.mockRestore();
      clearSelectionSpy.mockRestore();
    }
  });
});

/**
 * Construye un manifest v3 suficiente
 * para probar la finalización.
 */
function createManifest(): OtpvV3Manifest {
  return {
    formatVersion: OTPV_V3_FORMAT_VERSION,
    application: 'Osumi TPV Client',
    applicationVersion: '1.0.0',
    databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    backupId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-09-24T10:00:00.000Z',
    cryptoSuite: 'otpv3-scrypt-aes-256-gcm',
    authenticatedData: 'fixture',
    kdf: {
      algorithm: 'scrypt',
      salt: 'fixture',
      cost: 32768,
      blockSize: 8,
      parallelization: 3,
      length: 32,
    },
    keyWrap: {
      algorithm: 'aes-256-gcm',
      iv: 'fixture',
      authTag: 'fixture',
      wrappedDek: 'fixture',
    },
    payload: {
      entry: 'payload.enc',
      format: 'zip',
      algorithm: 'aes-256-gcm',
      iv: 'fixture',
      authTag: 'fixture',
    },
  };
}

/**
 * Repositorio de configuración controlado.
 */
class TestAppDataRepository implements AppDataRepository {
  installed: boolean = false;

  /**
   * Indica si la aplicación se considera instalada.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.installed);
  }

  /**
   * No se utiliza la carga en estos tests.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(null);
  }

  /**
   * No se utiliza el guardado en estos tests.
   */
  save(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * No se utiliza el borrado en estos tests.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Repositorio de impresión controlado.
 */
class TestPrintingSettingsRepository implements PrintingSettingsRepository {
  savedSettings: PrintingSettings | null = null;

  /**
   * Devuelve una configuración local vacía.
   */
  load(): Promise<PrintingSettings> {
    return Promise.resolve({
      schemaVersion: 1,
      ticketPrinterDeviceName: null,
    });
  }

  /**
   * Registra la configuración guardada.
   */
  save(settings: PrintingSettings): Promise<void> {
    this.savedSettings = settings;

    return Promise.resolve();
  }
}

/**
 * Finalizador controlado para verificar
 * promoción y recuperación.
 */
class TestInstallationFinalizer implements InstallationFinalizer {
  finalizeCalls: number = 0;
  recoverCalls: number = 0;
  finalizeError: Error | null = null;
  recoverError: Error | null = null;

  /**
   * Simula la recuperación del filesystem.
   */
  recover(): Promise<void> {
    this.recoverCalls += 1;

    if (this.recoverError !== null) {
      return Promise.reject(this.recoverError);
    }

    return Promise.resolve();
  }

  /**
   * Simula la promoción final.
   */
  finalize(): Promise<void> {
    this.finalizeCalls += 1;

    if (this.finalizeError !== null) {
      return Promise.reject(this.finalizeError);
    }

    return Promise.resolve();
  }
}

/**
 * Storage remoto controlado utilizado
 * durante los tests de restauración.
 */
class TestBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  value: BackupRemoteCredentials | null = null;

  saveCalls: number = 0;
  deleteCalls: number = 0;
  deleteError: Error | null = null;

  /**
   * Indica si existen credenciales almacenadas.
   */
  async exists(): Promise<boolean> {
    return this.value !== null;
  }

  /**
   * Recupera las credenciales almacenadas.
   */
  async load(): Promise<BackupRemoteCredentials | null> {
    return this.value === null
      ? null
      : {
          ...this.value,
        };
  }

  /**
   * Guarda las credenciales restauradas.
   */
  async save(credentials: BackupRemoteCredentials): Promise<void> {
    this.saveCalls++;

    this.value = {
      ...credentials,
    };
  }

  /**
   * Elimina las credenciales almacenadas.
   */
  async delete(): Promise<void> {
    this.deleteCalls++;

    if (this.deleteError !== null) {
      throw this.deleteError;
    }

    this.value = null;
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de finalización de restauraciones.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];
  readonly errorEvents: ApplicationLogEvent[] = [];

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
   * Conserva avisos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Conserva errores.
   */
  error(event: ApplicationLogEvent): void {
    this.errorEvents.push(event);
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}
