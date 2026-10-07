import type BackupAutomaticSchedule from '@backend/domain/backup/backup-automatic-schedule.interface';
import { isBackupAutomaticTime } from '@desktop-contracts/backup/backup-automatic-time';

/**
 * Resuelve el ciclo diario de las copias
 * remotas automáticas.
 *
 * Todas las horas programadas se interpretan
 * en la zona horaria local del terminal.
 */
export default class BackupAutomaticScheduleResolver {
  /**
   * Obtiene el último vencimiento, el siguiente
   * y si existe una copia automática pendiente.
   */
  resolve(
    now: Date,
    automaticTime: string,
    lastSuccessfulAt: string | null,
  ): BackupAutomaticSchedule {
    this.assertValidDate(now);

    if (!isBackupAutomaticTime(automaticTime)) {
      throw new Error('La hora de la copia automática no es válida.');
    }

    const [hourText, minuteText]: string[] = automaticTime.split(':');

    const hour: number = Number(hourText);
    const minute: number = Number(minuteText);

    const todayScheduledAt: Date = this.createScheduledAt(now, 0, hour, minute);

    let latestScheduledAt: Date;
    let nextScheduledAt: Date;

    if (todayScheduledAt.getTime() <= now.getTime()) {
      latestScheduledAt = todayScheduledAt;
      nextScheduledAt = this.createScheduledAt(now, 1, hour, minute);
    } else {
      latestScheduledAt = this.createScheduledAt(now, -1, hour, minute);
      nextScheduledAt = todayScheduledAt;
    }

    const lastSuccessfulDate: Date | null = this.resolveLastSuccessfulAt(lastSuccessfulAt);

    return {
      latestScheduledAt: latestScheduledAt.toISOString(),
      nextScheduledAt: nextScheduledAt.toISOString(),
      pending:
        lastSuccessfulDate === null || lastSuccessfulDate.getTime() < latestScheduledAt.getTime(),
    };
  }

  /**
   * Construye un vencimiento a partir de un día
   * civil y de la hora local configurada.
   *
   * Se reconstruye cada día desde sus componentes
   * locales para no asumir que todos los días duran
   * exactamente 24 horas.
   */
  private createScheduledAt(
    reference: Date,
    dayOffset: number,
    hour: number,
    minute: number,
  ): Date {
    return new Date(
      reference.getFullYear(),
      reference.getMonth(),
      reference.getDate() + dayOffset,
      hour,
      minute,
      0,
      0,
    );
  }

  /**
   * Convierte la fecha persistida del último éxito
   * en un Date válido.
   */
  private resolveLastSuccessfulAt(value: string | null): Date | null {
    if (value === null) {
      return null;
    }

    const date: Date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('La fecha de la última copia automática no es válida.');
    }

    return date;
  }

  /**
   * Comprueba que la fecha de referencia sea válida.
   */
  private assertValidDate(value: Date): void {
    if (Number.isNaN(value.getTime())) {
      throw new Error('La fecha actual no es válida.');
    }
  }
}
