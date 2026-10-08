import type BackupAutomaticExecutor from '@backend/contracts/backup/backup-automatic-executor.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type BackupAutomaticExecutionResult from '@backend/domain/backup/backup-automatic-execution-result.interface';

/**
 * Mantiene vivo el ciclo temporal de las
 * copias remotas automáticas.
 */
export default class BackupAutomaticSchedulerService {
  private static readonly RETRY_DELAY_MS: number = 60 * 60 * 1000;

  private timer: ReturnType<typeof setTimeout> | null = null;

  private started: boolean = false;

  private evaluating: boolean = false;

  private reevaluateRequested: boolean = false;

  /**
   * Crea el scheduler automático.
   *
   * now permite controlar el reloj desde tests.
   */
  constructor(
    private readonly executor: BackupAutomaticExecutor,
    private readonly applicationLogger: ApplicationLogger,
    private readonly now: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Arranca el scheduler.
   *
   * La primera evaluación se programa de forma
   * asíncrona para no bloquear el arranque de Electron.
   */
  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.scheduleAfter(0);
  }

  /**
   * Detiene futuras evaluaciones.
   *
   * Una copia que ya esté en ejecución no se cancela.
   * Si el proceso termina antes de completarla, el ciclo
   * seguirá pendiente en el siguiente arranque.
   */
  stop(): void {
    this.started = false;
    this.reevaluateRequested = false;

    this.clearTimer();
  }

  /**
   * Solicita reevaluar inmediatamente la programación.
   *
   * Se utilizará al reanudar el equipo y cuando cambie
   * una configuración relevante para los backups.
   */
  reevaluate(): void {
    if (!this.started) {
      return;
    }

    if (this.evaluating) {
      this.reevaluateRequested = true;

      return;
    }

    this.scheduleAfter(0);
  }

  /**
   * Ejecuta una evaluación y programa
   * automáticamente la siguiente.
   */
  private async evaluate(): Promise<void> {
    if (!this.started || this.evaluating) {
      return;
    }

    this.evaluating = true;

    let nextDelayMs: number = BackupAutomaticSchedulerService.RETRY_DELAY_MS;

    try {
      const result: BackupAutomaticExecutionResult = await this.executor.execute();

      nextDelayMs = this.resolveNextDelay(result);

      if (result.outcome === 'created') {
        this.applicationLogger.info({
          area: 'backup',
          operation: 'automatic-backup-created',
          message: 'Se ha creado correctamente una copia remota automática.',
          context: {
            lastSuccessfulAt: result.status?.lastSuccessfulAt ?? null,
            nextScheduledAt: result.status?.nextScheduledAt ?? null,
          },
        });
      }
    } catch (error: unknown) {
      this.applicationLogger.error({
        area: 'backup',
        operation: 'automatic-scheduler-evaluate',
        message: 'No se ha podido completar la evaluación de la copia remota automática.',
        error,
        context: {
          retryDelayMs: BackupAutomaticSchedulerService.RETRY_DELAY_MS,
        },
      });
    } finally {
      this.evaluating = false;
    }

    if (!this.started) {
      return;
    }

    if (this.reevaluateRequested) {
      this.reevaluateRequested = false;

      this.scheduleAfter(0);

      return;
    }

    this.scheduleAfter(nextDelayMs);
  }

  /**
   * Calcula cuánto falta para la siguiente evaluación.
   *
   * Cuando no existe un próximo vencimiento conocido,
   * se utiliza el intervalo de retry.
   */
  private resolveNextDelay(result: BackupAutomaticExecutionResult): number {
    if (result.status === null) {
      return BackupAutomaticSchedulerService.RETRY_DELAY_MS;
    }

    const nextScheduledAt: Date = new Date(result.status.nextScheduledAt);
    const now: Date = this.now();

    if (Number.isNaN(nextScheduledAt.getTime()) || Number.isNaN(now.getTime())) {
      this.applicationLogger.error({
        area: 'backup',
        operation: 'automatic-scheduler-schedule',
        message: 'No se ha podido calcular el próximo ciclo de copia automática.',
        context: {
          nextScheduledAt: result.status.nextScheduledAt,
          currentTime: Number.isNaN(now.getTime()) ? null : now.toISOString(),
          retryDelayMs: BackupAutomaticSchedulerService.RETRY_DELAY_MS,
        },
      });

      return BackupAutomaticSchedulerService.RETRY_DELAY_MS;
    }

    return Math.max(0, nextScheduledAt.getTime() - now.getTime());
  }

  /**
   * Programa una nueva evaluación después
   * del intervalo indicado.
   */
  private scheduleAfter(delayMs: number): void {
    if (!this.started) {
      return;
    }

    this.clearTimer();

    this.timer = setTimeout((): void => {
      this.timer = null;

      void this.evaluate();
    }, delayMs);
  }

  /**
   * Cancela el timer actualmente programado.
   */
  private clearTimer(): void {
    if (this.timer === null) {
      return;
    }

    clearTimeout(this.timer);

    this.timer = null;
  }
}
