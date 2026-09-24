import OtpvV3RestoreFinalizeService from '@backend/application/backup/otpv-v3-restore-finalize.service';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type PrintingSettings from '@desktop-contracts/configuration/printing/printing-settings.interface';
import InMemoryOtpvV3PreparedRestoreStore from '@infrastructure/backup/in-memory-otpv-v3-prepared-restore.store';
import InMemoryOtpvV3RestoreSelectionStore from '@infrastructure/backup/in-memory-otpv-v3-restore-selection.store';
import { describe, expect, it } from 'vitest';

describe('OtpvV3RestoreFinalizeService', (): void => {
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
    });

    const appDataRepository = new TestAppDataRepository();

    const printingSettingsRepository = new TestPrintingSettingsRepository();

    const finalizer = new TestInstallationFinalizer();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      appDataRepository,
      printingSettingsRepository,
      finalizer,
    );

    const result: BackupRestoreFinalizeResult = await service.finalize(selectionId);

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
  });

  it('rechaza una selección cuyo staging no está preparado', async (): Promise<void> => {
    const selectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const manifest: OtpvV3Manifest = createManifest();

    const selectionId: string = selectionStore.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const finalizer = new TestInstallationFinalizer();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      new InMemoryOtpvV3PreparedRestoreStore(),
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      finalizer,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'no tiene una restauración preparada',
    );

    expect(finalizer.finalizeCalls).toBe(0);
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
    });

    const finalizer = new TestInstallationFinalizer();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      finalizer,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'no tiene una restauración preparada',
    );

    expect(finalizer.finalizeCalls).toBe(0);
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
    });

    const appDataRepository = new TestAppDataRepository();

    appDataRepository.installed = true;

    const finalizer = new TestInstallationFinalizer();

    const printingSettingsRepository = new TestPrintingSettingsRepository();

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      appDataRepository,
      printingSettingsRepository,
      finalizer,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow('instalación ya configurada');

    expect(finalizer.finalizeCalls).toBe(0);
    expect(printingSettingsRepository.savedSettings).toBeNull();
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
    });

    const finalizer = new TestInstallationFinalizer();

    finalizer.finalizeError = new Error('Falló una promoción.');

    const service = new OtpvV3RestoreFinalizeService(
      selectionStore,
      preparedStore,
      new TestAppDataRepository(),
      new TestPrintingSettingsRepository(),
      finalizer,
    );

    await expect(service.finalize(selectionId)).rejects.toThrow(
      'No se ha podido completar la restauración',
    );

    expect(finalizer.finalizeCalls).toBe(1);
    expect(finalizer.recoverCalls).toBe(1);

    expect(preparedStore.resolve()).toBeNull();

    /*
     * La selección se conserva para permitir
     * volver a desbloquear la misma copia.
     */
    expect(selectionStore.resolve(selectionId)).not.toBeNull();
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

  /**
   * Simula la recuperación del filesystem.
   */
  recover(): Promise<void> {
    this.recoverCalls += 1;

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
