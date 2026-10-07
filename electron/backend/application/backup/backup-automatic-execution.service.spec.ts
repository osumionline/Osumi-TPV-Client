import BackupAutomaticExecutionService from '@backend/application/backup/backup-automatic-execution.service';
import BackupAutomaticScheduleResolver from '@backend/application/backup/backup-automatic-schedule.resolver';
import BackupAutomaticStateService from '@backend/application/backup/backup-automatic-state.service';
import type BackupAutomaticStateRepository from '@backend/contracts/backup/backup-automatic-state.repository.interface';
import type BackupRemoteCreator from '@backend/contracts/backup/backup-remote-creator.interface';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type BackupAutomaticExecutionResult from '@backend/domain/backup/backup-automatic-execution-result.interface';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import type {
  BackupRemoteCredentials,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let appDataRepository: MemoryAppDataRepository;
let credentialStorage: MemoryBackupRemoteCredentialStorage;
let stateRepository: MemoryBackupAutomaticStateRepository;
let stateService: BackupAutomaticStateService;
let remoteCreator: TestBackupRemoteCreator;

describe('BackupAutomaticExecutionService', (): void => {
  beforeEach((): void => {
    appDataRepository = new MemoryAppDataRepository(createAppData());

    credentialStorage = new MemoryBackupRemoteCredentialStorage({
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    });

    stateRepository = new MemoryBackupAutomaticStateRepository();

    stateService = new BackupAutomaticStateService(
      stateRepository,
      new BackupAutomaticScheduleResolver(),
    );

    remoteCreator = new TestBackupRemoteCreator();
  });

  it('no ejecuta nada cuando la instalación todavía no está completa', async (): Promise<void> => {
    appDataRepository.value = null;

    const service: BackupAutomaticExecutionService = createService([
      new Date(2026, 9, 7, 8, 0, 0, 0),
    ]);

    const result: BackupAutomaticExecutionResult = await service.execute();

    expect(result).toEqual({
      outcome: 'not-installed',
      status: null,
    });

    expect(remoteCreator.createCalls).toBe(0);
  });

  it('no crea una copia cuando TPV Backup no está configurado', async (): Promise<void> => {
    credentialStorage.credentials = null;

    const service: BackupAutomaticExecutionService = createService([
      new Date(2026, 9, 7, 8, 0, 0, 0),
    ]);

    const result: BackupAutomaticExecutionResult = await service.execute();

    expect(result.outcome).toBe('not-configured');
    expect(result.status?.pending).toBe(true);
    expect(remoteCreator.createCalls).toBe(0);
  });

  it('no crea una copia cuando el ciclo actual ya está cubierto', async (): Promise<void> => {
    stateRepository.state = {
      schemaVersion: 1,
      lastSuccessfulAt: new Date(2026, 9, 7, 3, 5, 0, 0).toISOString(),
    };

    const service: BackupAutomaticExecutionService = createService([
      new Date(2026, 9, 7, 8, 0, 0, 0),
    ]);

    const result: BackupAutomaticExecutionResult = await service.execute();

    expect(result.outcome).toBe('not-pending');
    expect(result.status?.pending).toBe(false);
    expect(remoteCreator.createCalls).toBe(0);
  });

  it('crea una copia pendiente y registra la hora real de finalización', async (): Promise<void> => {
    const startedAt: Date = new Date(2026, 9, 7, 8, 0, 0, 0);

    const completedAt: Date = new Date(2026, 9, 7, 8, 4, 12, 345);

    const service: BackupAutomaticExecutionService = createService([startedAt, completedAt]);

    const result: BackupAutomaticExecutionResult = await service.execute();

    expect(remoteCreator.createCalls).toBe(1);

    expect(stateRepository.state).toEqual({
      schemaVersion: 1,
      lastSuccessfulAt: completedAt.toISOString(),
    });

    expect(result.outcome).toBe('created');
    expect(result.status?.lastSuccessfulAt).toBe(completedAt.toISOString());
    expect(result.status?.pending).toBe(false);
  });

  it('no marca el ciclo como correcto cuando falla la copia remota', async (): Promise<void> => {
    remoteCreator.error = new Error('TPV Backup no disponible.');

    const service: BackupAutomaticExecutionService = createService([
      new Date(2026, 9, 7, 8, 0, 0, 0),
    ]);

    await expect(service.execute()).rejects.toThrow('TPV Backup no disponible.');

    expect(remoteCreator.createCalls).toBe(1);
    expect(stateRepository.state).toBeNull();
  });

  it('permite reintentar después de un fallo', async (): Promise<void> => {
    remoteCreator.error = new Error('TPV Backup no disponible.');

    const service: BackupAutomaticExecutionService = createService([
      new Date(2026, 9, 7, 8, 0, 0, 0),
      new Date(2026, 9, 7, 9, 0, 0, 0),
      new Date(2026, 9, 7, 9, 2, 0, 0),
    ]);

    await expect(service.execute()).rejects.toThrow('TPV Backup no disponible.');

    remoteCreator.error = null;

    const result: BackupAutomaticExecutionResult = await service.execute();

    expect(result.outcome).toBe('created');
    expect(remoteCreator.createCalls).toBe(2);
    expect(stateRepository.state).not.toBeNull();
  });
});

/**
 * Construye el servicio con un reloj determinista.
 */
function createService(dates: readonly Date[]): BackupAutomaticExecutionService {
  let index: number = 0;

  return new BackupAutomaticExecutionService(
    appDataRepository,
    credentialStorage,
    stateService,
    remoteCreator,
    (): Date => {
      const date: Date | undefined = dates[index];

      if (date === undefined) {
        throw new Error('El test no ha configurado suficientes fechas.');
      }

      index++;

      return date;
    },
  );
}

/**
 * Repositorio de AppData en memoria.
 */
class MemoryAppDataRepository implements AppDataRepository {
  /**
   * Crea el repositorio con el valor inicial.
   */
  constructor(public value: AppData | null) {}

  /**
   * Indica si existe configuración.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.value !== null);
  }

  /**
   * Recupera la configuración.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(this.value);
  }

  /**
   * Guarda la configuración.
   */
  save(appData: AppData): Promise<void> {
    this.value = appData;

    return Promise.resolve();
  }

  /**
   * Elimina la configuración.
   */
  delete(): Promise<void> {
    this.value = null;

    return Promise.resolve();
  }
}

/**
 * Storage de credenciales remoto en memoria.
 */
class MemoryBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  /**
   * Crea el storage con las credenciales indicadas.
   */
  constructor(public credentials: BackupRemoteCredentials | null) {}

  /**
   * Indica si existen credenciales.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.credentials !== null);
  }

  /**
   * Recupera las credenciales.
   */
  load(): Promise<BackupRemoteCredentials | null> {
    return Promise.resolve(
      this.credentials === null
        ? null
        : {
            ...this.credentials,
          },
    );
  }

  /**
   * Guarda las credenciales.
   */
  save(credentials: BackupRemoteCredentials): Promise<void> {
    this.credentials = {
      ...credentials,
    };

    return Promise.resolve();
  }

  /**
   * Elimina las credenciales.
   */
  delete(): Promise<void> {
    this.credentials = null;

    return Promise.resolve();
  }
}

/**
 * Repositorio de estado automático en memoria.
 */
class MemoryBackupAutomaticStateRepository implements BackupAutomaticStateRepository {
  state: BackupAutomaticState | null = null;

  /**
   * Recupera el estado.
   */
  load(): Promise<BackupAutomaticState | null> {
    return Promise.resolve(
      this.state === null
        ? null
        : {
            ...this.state,
          },
    );
  }

  /**
   * Guarda el estado.
   */
  save(state: BackupAutomaticState): Promise<void> {
    this.state = {
      ...state,
    };

    return Promise.resolve();
  }

  /**
   * Elimina el estado.
   */
  delete(): Promise<void> {
    this.state = null;

    return Promise.resolve();
  }
}

/**
 * Creador remoto controlado por los tests.
 */
class TestBackupRemoteCreator implements BackupRemoteCreator {
  createCalls: number = 0;
  error: Error | null = null;

  /**
   * Simula la creación remota.
   */
  create(): Promise<BackupRemoteUploadResult> {
    this.createCalls++;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve({
      publicId: 'backup-public-id',
      backupId: 'backup-id',
      createdAtClient: '2026-10-07T06:00:00.000Z',
      originalFilename: 'backup.otpv',
      sizeBytes: 1024,
      sha256: 'a'.repeat(64),
    });
  }
}

/**
 * Construye un AppData válido para los tests.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-10-01T08:00:00.000Z',

    nombre: 'Empresa',
    nombreComercial: 'Comercio',
    cif: 'B12345678',
    telefono: '',
    direccion: '',
    poblacion: '',
    email: '',

    twitter: '',
    facebook: '',
    instagram: '',
    web: '',

    frasesTicket: [],

    ticketEmail: {
      subjectTemplate: 'Ticket',
      bodyTemplate: 'Ticket',
    },

    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [30],

    ventaOnline: false,
    urlApi: '',

    emailSmtp: null,
    ticketBai: null,

    backupAutomaticTime: '03:00',

    fechaCad: false,
  };
}
