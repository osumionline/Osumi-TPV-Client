import BackupAutomaticQueryService from '@backend/application/backup/backup-automatic-query.service';
import BackupAutomaticScheduleResolver from '@backend/application/backup/backup-automatic-schedule.resolver';
import BackupAutomaticStateService from '@backend/application/backup/backup-automatic-state.service';
import type BackupAutomaticStateRepository from '@backend/contracts/backup/backup-automatic-state.repository.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import type BackupAutomaticInfo from '@desktop-contracts/backup/backup-automatic-info.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let appDataRepository: MemoryAppDataRepository;
let stateRepository: MemoryBackupAutomaticStateRepository;
let queryService: BackupAutomaticQueryService;

describe('BackupAutomaticQueryService', (): void => {
  beforeEach((): void => {
    appDataRepository = new MemoryAppDataRepository(createAppData());
    stateRepository = new MemoryBackupAutomaticStateRepository();

    const stateService: BackupAutomaticStateService = new BackupAutomaticStateService(
      stateRepository,
      new BackupAutomaticScheduleResolver(),
    );

    queryService = new BackupAutomaticQueryService(
      appDataRepository,
      stateService,
      (): Date => new Date(2026, 9, 7, 8, 0, 0, 0),
    );
  });

  it('devuelve null cuando todavía no existe instalación', async (): Promise<void> => {
    appDataRepository.value = null;

    await expect(queryService.getStatus()).resolves.toBeNull();
  });

  it('devuelve la programación y el último éxito persistido', async (): Promise<void> => {
    const lastSuccessfulAt: string = new Date(2026, 9, 7, 3, 5, 0, 0).toISOString();

    stateRepository.state = {
      schemaVersion: 1,
      lastSuccessfulAt,
    };

    const result: BackupAutomaticInfo | null = await queryService.getStatus();

    expect(result).not.toBeNull();

    expect(result?.automaticTime).toBe('03:00');
    expect(result?.lastSuccessfulAt).toBe(lastSuccessfulAt);
    expect(result?.pending).toBe(false);

    expectLocalDate(result?.nextScheduledAt ?? '', 2026, 10, 8, 3, 0);
  });
});

/**
 * Repositorio de configuración en memoria.
 */
class MemoryAppDataRepository implements AppDataRepository {
  /**
   * Crea el repositorio con el valor indicado.
   */
  constructor(public value: AppData | null) {}

  /**
   * Indica si existe configuración.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.value !== null);
  }

  /**
   * Obtiene la configuración.
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
 * Comprueba una fecha ISO en hora local.
 */
function expectLocalDate(
  iso: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): void {
  const date: Date = new Date(iso);

  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month - 1);
  expect(date.getDate()).toBe(day);
  expect(date.getHours()).toBe(hour);
  expect(date.getMinutes()).toBe(minute);
}

/**
 * Construye la configuración de prueba.
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
