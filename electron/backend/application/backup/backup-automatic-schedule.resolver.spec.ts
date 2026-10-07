import BackupAutomaticScheduleResolver from '@backend/application/backup/backup-automatic-schedule.resolver';
import type BackupAutomaticSchedule from '@backend/domain/backup/backup-automatic-schedule.interface';
import { describe, expect, it } from 'vitest';

describe('BackupAutomaticScheduleResolver', (): void => {
  it('considera pendiente el vencimiento de hoy cuando ya ha pasado la hora', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 8, 0, 0, 0);

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', null);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 7, 3, 0);
    expectLocalDate(result.nextScheduledAt, 2026, 10, 8, 3, 0);
    expect(result.pending).toBe(true);
  });

  it('utiliza el vencimiento de ayer cuando todavía no ha llegado la hora de hoy', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 2, 0, 0, 0);

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', null);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 6, 3, 0);
    expectLocalDate(result.nextScheduledAt, 2026, 10, 7, 3, 0);
    expect(result.pending).toBe(true);
  });

  it('considera cubierto el ciclo cuando el último éxito es posterior al vencimiento', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 8, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 7, 3, 5, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', lastSuccessfulAt);

    expect(result.pending).toBe(false);
  });

  it('considera cubierto el ciclo cuando el éxito coincide exactamente con el vencimiento', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 8, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 7, 3, 0, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', lastSuccessfulAt);

    expect(result.pending).toBe(false);
  });

  it('considera pendiente el ciclo cuando el último éxito pertenece al vencimiento anterior', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 8, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 6, 3, 5, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', lastSuccessfulAt);

    expect(result.pending).toBe(true);
  });

  it('solo representa un vencimiento pendiente aunque el equipo lleve varios días sin ejecutar', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 10, 12, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 5, 3, 5, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', lastSuccessfulAt);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 10, 3, 0);
    expectLocalDate(result.nextScheduledAt, 2026, 10, 11, 3, 0);
    expect(result.pending).toBe(true);
  });

  it('recalcula correctamente un cambio de horario hacia una hora ya vencida', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 12, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 6, 23, 5, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '03:00', lastSuccessfulAt);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 7, 3, 0);
    expect(result.pending).toBe(true);
  });

  it('no duplica la copia al cambiar a una hora todavía no vencida', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 12, 0, 0, 0);

    const lastSuccessfulAt: string = new Date(2026, 9, 7, 3, 5, 0, 0).toISOString();

    const result: BackupAutomaticSchedule = resolver.resolve(now, '23:00', lastSuccessfulAt);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 6, 23, 0);
    expectLocalDate(result.nextScheduledAt, 2026, 10, 7, 23, 0);
    expect(result.pending).toBe(false);
  });

  it('resuelve correctamente un horario configurado a medianoche', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    const now: Date = new Date(2026, 9, 7, 0, 15, 0, 0);

    const result: BackupAutomaticSchedule = resolver.resolve(now, '00:00', null);

    expectLocalDate(result.latestScheduledAt, 2026, 10, 7, 0, 0);
    expectLocalDate(result.nextScheduledAt, 2026, 10, 8, 0, 0);
    expect(result.pending).toBe(true);
  });

  it('rechaza una hora automática inválida', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    expect((): BackupAutomaticSchedule =>
      resolver.resolve(new Date(2026, 9, 7, 8, 0, 0, 0), '25:00', null),
    ).toThrow('La hora de la copia automática no es válida.');
  });

  it('rechaza una fecha de último éxito inválida', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    expect((): BackupAutomaticSchedule =>
      resolver.resolve(new Date(2026, 9, 7, 8, 0, 0, 0), '03:00', 'fecha-invalida'),
    ).toThrow('La fecha de la última copia automática no es válida.');
  });

  it('rechaza una fecha actual inválida', (): void => {
    const resolver: BackupAutomaticScheduleResolver = new BackupAutomaticScheduleResolver();

    expect((): BackupAutomaticSchedule =>
      resolver.resolve(new Date(Number.NaN), '03:00', null),
    ).toThrow('La fecha actual no es válida.');
  });
});

/**
 * Comprueba que un ISO UTC representa la fecha
 * civil local esperada en el terminal del test.
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
