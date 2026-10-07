import type BackupAutomaticStateService from '@backend/application/backup/backup-automatic-state.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';
import type BackupAutomaticInfo from '@desktop-contracts/backup/backup-automatic-info.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';

/**
 * Expone el estado actual de las copias automáticas
 * para las fronteras públicas de la aplicación.
 */
export default class BackupAutomaticQueryService {
  /**
   * Crea el servicio de consulta.
   *
   * now permite controlar el instante desde tests.
   */
  constructor(
    private readonly appDataRepository: AppDataRepository,
    private readonly stateService: BackupAutomaticStateService,
    private readonly now: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Obtiene la programación automática actual.
   *
   * Devuelve null cuando todavía no existe
   * una instalación configurada.
   */
  async getStatus(): Promise<BackupAutomaticInfo | null> {
    const appData: AppData | null = await this.appDataRepository.load();

    if (appData === null) {
      return null;
    }

    const status: BackupAutomaticStatus = await this.stateService.getStatus(
      this.now(),
      appData.backupAutomaticTime,
    );

    return {
      automaticTime: status.automaticTime,
      lastSuccessfulAt: status.lastSuccessfulAt,
      latestScheduledAt: status.latestScheduledAt,
      nextScheduledAt: status.nextScheduledAt,
      pending: status.pending,
    };
  }
}
