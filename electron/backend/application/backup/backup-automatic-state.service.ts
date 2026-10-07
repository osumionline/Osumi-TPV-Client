import BackupAutomaticScheduleResolver from '@backend/application/backup/backup-automatic-schedule.resolver';
import type BackupAutomaticStateRepository from '@backend/contracts/backup/backup-automatic-state.repository.interface';
import type BackupAutomaticSchedule from '@backend/domain/backup/backup-automatic-schedule.interface';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';

/**
 * Gestiona el estado operativo de las copias
 * remotas automáticas.
 */
export default class BackupAutomaticStateService {
  /**
   * Crea el servicio de estado automático.
   */
  constructor(
    private readonly repository: BackupAutomaticStateRepository,
    private readonly scheduleResolver: BackupAutomaticScheduleResolver,
  ) {}

  /**
   * Obtiene el estado de la programación para
   * el instante y horario indicados.
   */
  async getStatus(now: Date, automaticTime: string): Promise<BackupAutomaticStatus> {
    const state: BackupAutomaticState | null = await this.repository.load();

    const schedule: BackupAutomaticSchedule = this.scheduleResolver.resolve(
      now,
      automaticTime,
      state?.lastSuccessfulAt ?? null,
    );

    return {
      automaticTime,
      lastSuccessfulAt: state?.lastSuccessfulAt ?? null,
      latestScheduledAt: schedule.latestScheduledAt,
      nextScheduledAt: schedule.nextScheduledAt,
      pending: schedule.pending,
    };
  }

  /**
   * Registra una ejecución automática completada
   * correctamente en el instante indicado.
   */
  async markSuccessful(completedAt: Date): Promise<void> {
    if (Number.isNaN(completedAt.getTime())) {
      throw new Error('La fecha de finalización de la copia automática no es válida.');
    }

    await this.repository.save({
      schemaVersion: 1,
      lastSuccessfulAt: completedAt.toISOString(),
    });
  }

  /**
   * Elimina el estado perteneciente a la
   * instalación anterior.
   */
  async reset(): Promise<void> {
    await this.repository.delete();
  }
}
