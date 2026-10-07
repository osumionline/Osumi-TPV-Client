import BackupAutomaticScheduleResolver from '@backend/application/backup/backup-automatic-schedule.resolver';
import BackupAutomaticStateService from '@backend/application/backup/backup-automatic-state.service';
import type BackupAutomaticStateRepository from '@backend/contracts/backup/backup-automatic-state.repository.interface';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let repository: MemoryBackupAutomaticStateRepository;
let service: BackupAutomaticStateService;

describe('BackupAutomaticStateService', (): void => {
  beforeEach((): void => {
    repository = new MemoryBackupAutomaticStateRepository();

    service = new BackupAutomaticStateService(repository, new BackupAutomaticScheduleResolver());
  });

  it('considera pendiente el ciclo cuando todavía no existe estado', async (): Promise<void> => {
    const status: BackupAutomaticStatus = await service.getStatus(
      new Date(2026, 9, 7, 8, 0, 0, 0),
      '03:00',
    );

    expect(status.automaticTime).toBe('03:00');
    expect(status.lastSuccessfulAt).toBeNull();
    expect(status.pending).toBe(true);

    expectLocalDate(status.latestScheduledAt, 2026, 10, 7, 3, 0);
    expectLocalDate(status.nextScheduledAt, 2026, 10, 8, 3, 0);
  });

  it('utiliza el último éxito persistido para resolver el ciclo', async (): Promise<void> => {
    const lastSuccessfulAt: string = new Date(2026, 9, 7, 3, 5, 0, 0).toISOString();

    repository.state = {
      schemaVersion: 1,
      lastSuccessfulAt,
    };

    const status: BackupAutomaticStatus = await service.getStatus(
      new Date(2026, 9, 7, 8, 0, 0, 0),
      '03:00',
    );

    expect(status.lastSuccessfulAt).toBe(lastSuccessfulAt);
    expect(status.pending).toBe(false);
  });

  it('marca una ejecución correcta utilizando el instante real de finalización', async (): Promise<void> => {
    const completedAt: Date = new Date(2026, 9, 7, 3, 7, 12, 345);

    await service.markSuccessful(completedAt);

    expect(repository.state).toEqual({
      schemaVersion: 1,
      lastSuccessfulAt: completedAt.toISOString(),
    });
  });

  it('el ciclo deja de estar pendiente después de registrar un éxito', async (): Promise<void> => {
    await service.markSuccessful(new Date(2026, 9, 7, 3, 5, 0, 0));

    const status: BackupAutomaticStatus = await service.getStatus(
      new Date(2026, 9, 7, 8, 0, 0, 0),
      '03:00',
    );

    expect(status.pending).toBe(false);
  });

  it('no modifica el estado si la fecha de finalización no es válida', async (): Promise<void> => {
    repository.state = {
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-06T01:05:00.000Z',
    };

    await expect(service.markSuccessful(new Date(Number.NaN))).rejects.toThrow(
      'La fecha de finalización de la copia automática no es válida.',
    );

    expect(repository.state).toEqual({
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-06T01:05:00.000Z',
    });
  });

  it('recalcula el estado cuando cambia la hora configurada', async (): Promise<void> => {
    repository.state = {
      schemaVersion: 1,
      lastSuccessfulAt: new Date(2026, 9, 6, 23, 5, 0, 0).toISOString(),
    };

    const status: BackupAutomaticStatus = await service.getStatus(
      new Date(2026, 9, 7, 12, 0, 0, 0),
      '03:00',
    );

    expect(status.automaticTime).toBe('03:00');
    expect(status.pending).toBe(true);

    expectLocalDate(status.latestScheduledAt, 2026, 10, 7, 3, 0);
  });

  it('resetea el estado de una instalación anterior', async (): Promise<void> => {
    repository.state = {
      schemaVersion: 1,
      lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    };

    await service.reset();

    expect(repository.state).toBeNull();
    expect(repository.deleteCalls).toBe(1);
  });
});

/**
 * Repositorio en memoria utilizado por los tests.
 */
class MemoryBackupAutomaticStateRepository implements BackupAutomaticStateRepository {
  state: BackupAutomaticState | null = null;
  deleteCalls: number = 0;

  /**
   * Recupera el estado actual.
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
   * Guarda una copia del estado indicado.
   */
  save(state: BackupAutomaticState): Promise<void> {
    this.state = {
      ...state,
    };

    return Promise.resolve();
  }

  /**
   * Elimina el estado actual.
   */
  delete(): Promise<void> {
    this.state = null;
    this.deleteCalls++;

    return Promise.resolve();
  }
}

/**
 * Comprueba que un ISO UTC represente la
 * fecha civil local esperada.
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
  expect(date.getSeconds()).toBe(0);
  expect(date.getMilliseconds()).toBe(0);
}
