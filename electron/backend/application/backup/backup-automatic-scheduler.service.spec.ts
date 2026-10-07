import BackupAutomaticSchedulerService from '@backend/application/backup/backup-automatic-scheduler.service';
import type BackupAutomaticExecutor from '@backend/contracts/backup/backup-automatic-executor.interface';
import type BackupAutomaticExecutionResult from '@backend/domain/backup/backup-automatic-execution-result.interface';
import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let executor: TestBackupAutomaticExecutor;
let scheduler: BackupAutomaticSchedulerService;

describe('BackupAutomaticSchedulerService', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date(2026, 9, 7, 8, 0, 0, 0));

    executor = new TestBackupAutomaticExecutor();

    scheduler = new BackupAutomaticSchedulerService(executor);
  });

  afterEach((): void => {
    scheduler.stop();

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('evalúa inmediatamente al arrancar', async (): Promise<void> => {
    executor.results.push(createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)));

    scheduler.start();

    expect(executor.executeCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);
  });

  it('programa la siguiente evaluación para el próximo vencimiento', async (): Promise<void> => {
    executor.results.push(
      createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)),

      createResult('created', new Date(2026, 9, 9, 3, 0, 0, 0)),
    );

    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(18 * 60 * 60 * 1000 + 59 * 60 * 1000);

    expect(executor.executeCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(executor.executeCalls).toBe(2);
  });

  it('reintenta aproximadamente una hora después de un fallo', async (): Promise<void> => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    executor.results.push(
      new Error('TPV Backup no disponible.'),

      createResult('created', new Date(2026, 9, 8, 3, 0, 0, 0)),
    );

    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);
    expect(consoleError).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(59 * 60 * 1000);

    expect(executor.executeCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(executor.executeCalls).toBe(2);
  });

  it('reintenta una hora después cuando todavía no existe instalación', async (): Promise<void> => {
    executor.results.push(
      {
        outcome: 'not-installed',
        status: null,
      },

      createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)),
    );

    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(executor.executeCalls).toBe(2);
  });

  it('puede forzar una reevaluación inmediata', async (): Promise<void> => {
    executor.results.push(
      createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)),

      createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)),
    );

    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);

    scheduler.reevaluate();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(2);
  });

  it('pospone una reevaluación solicitada mientras otra evaluación está en curso', async (): Promise<void> => {
    const pendingExecutor: PendingBackupAutomaticExecutor = new PendingBackupAutomaticExecutor();

    const pendingScheduler: BackupAutomaticSchedulerService = new BackupAutomaticSchedulerService(
      pendingExecutor,
    );

    pendingScheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(pendingExecutor.executeCalls).toBe(1);

    pendingScheduler.reevaluate();
    pendingScheduler.reevaluate();

    await vi.advanceTimersByTimeAsync(0);

    expect(pendingExecutor.executeCalls).toBe(1);

    pendingExecutor.complete(createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)));

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(pendingExecutor.executeCalls).toBe(2);

    pendingScheduler.stop();
  });

  it('no hace nada al reevaluar si todavía no está arrancado', async (): Promise<void> => {
    scheduler.reevaluate();

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(executor.executeCalls).toBe(0);
  });

  it('detiene las evaluaciones futuras', async (): Promise<void> => {
    executor.results.push(createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)));

    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);

    scheduler.stop();

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(executor.executeCalls).toBe(1);
  });

  it('arrancar dos veces no duplica la programación', async (): Promise<void> => {
    executor.results.push(createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)));

    scheduler.start();
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(executor.executeCalls).toBe(1);
  });
});

/**
 * Ejecutor automático controlado por los tests.
 */
class TestBackupAutomaticExecutor implements BackupAutomaticExecutor {
  readonly results: (BackupAutomaticExecutionResult | Error)[] = [];

  executeCalls: number = 0;

  /**
   * Devuelve el siguiente resultado configurado.
   */
  execute(): Promise<BackupAutomaticExecutionResult> {
    this.executeCalls++;

    const result: BackupAutomaticExecutionResult | Error | undefined = this.results.shift();

    if (result === undefined) {
      return Promise.reject(new Error('El test no ha configurado un resultado para el ejecutor.'));
    }

    if (result instanceof Error) {
      return Promise.reject(result);
    }

    return Promise.resolve(result);
  }
}

/**
 * Ejecutor cuya primera llamada permanece pendiente
 * hasta que el test la completa explícitamente.
 */
class PendingBackupAutomaticExecutor implements BackupAutomaticExecutor {
  executeCalls: number = 0;

  private resolvePending: ((result: BackupAutomaticExecutionResult) => void) | null = null;

  /**
   * Mantiene pendiente la primera ejecución.
   *
   * Las posteriores devuelven un estado cubierto
   * para que el scheduler pueda continuar normalmente.
   */
  execute(): Promise<BackupAutomaticExecutionResult> {
    this.executeCalls++;

    if (this.executeCalls > 1) {
      return Promise.resolve(createResult('not-pending', new Date(2026, 9, 8, 3, 0, 0, 0)));
    }

    return new Promise<BackupAutomaticExecutionResult>(
      (resolve: (result: BackupAutomaticExecutionResult) => void): void => {
        this.resolvePending = resolve;
      },
    );
  }

  /**
   * Completa la evaluación que permanece pendiente.
   */
  complete(result: BackupAutomaticExecutionResult): void {
    if (this.resolvePending === null) {
      throw new Error('No existe ninguna evaluación pendiente.');
    }

    const resolve: (result: BackupAutomaticExecutionResult) => void = this.resolvePending;

    this.resolvePending = null;

    resolve(result);
  }
}

/**
 * Construye un resultado con un próximo
 * vencimiento determinado.
 */
function createResult(
  outcome: 'not-pending' | 'created',
  nextScheduledAt: Date,
): BackupAutomaticExecutionResult {
  return {
    outcome,
    status: createStatus(nextScheduledAt),
  };
}

/**
 * Construye el estado automático utilizado
 * por los tests del scheduler.
 */
function createStatus(nextScheduledAt: Date): BackupAutomaticStatus {
  return {
    automaticTime: '03:00',
    lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    latestScheduledAt: '2026-10-07T01:00:00.000Z',
    nextScheduledAt: nextScheduledAt.toISOString(),
    pending: false,
  };
}
