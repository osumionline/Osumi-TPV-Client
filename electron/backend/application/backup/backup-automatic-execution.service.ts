import type BackupAutomaticStateService from '@backend/application/backup/backup-automatic-state.service';
import type BackupAutomaticExecutor from '@backend/contracts/backup/backup-automatic-executor.interface';
import type BackupRemoteCreator from '@backend/contracts/backup/backup-remote-creator.interface';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type BackupAutomaticExecutionResult from '@backend/domain/backup/backup-automatic-execution-result.interface';
import type BackupAutomaticStatus from '@backend/domain/backup/backup-automatic-status.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';

/**
 * Evalúa y ejecuta una copia remota automática
 * cuando existe un ciclo diario pendiente.
 */
export default class BackupAutomaticExecutionService implements BackupAutomaticExecutor {
  private running: boolean = false;

  /**
   * Crea el ejecutor de copias automáticas.
   *
   * now permite utilizar un reloj determinista
   * desde los tests.
   */
  constructor(
    private readonly appDataRepository: AppDataRepository,
    private readonly credentialStorage: BackupRemoteCredentialStorage,
    private readonly stateService: BackupAutomaticStateService,
    private readonly remoteCreator: BackupRemoteCreator,
    private readonly now: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Evalúa el estado actual y crea una copia
   * remota únicamente cuando corresponde.
   *
   * Los estados operativos normales se devuelven
   * como resultado. Los fallos reales se propagan
   * para permitir que el scheduler programe un retry.
   */
  async execute(): Promise<BackupAutomaticExecutionResult> {
    if (this.running) {
      return {
        outcome: 'busy',
        status: null,
      };
    }

    this.running = true;

    try {
      const appData: AppData | null = await this.appDataRepository.load();

      if (appData === null) {
        return {
          outcome: 'not-installed',
          status: null,
        };
      }

      const startedAt: Date = this.now();

      const status: BackupAutomaticStatus = await this.stateService.getStatus(
        startedAt,
        appData.backupAutomaticTime,
      );

      if (!(await this.credentialStorage.exists())) {
        return {
          outcome: 'not-configured',
          status,
        };
      }

      if (!status.pending) {
        return {
          outcome: 'not-pending',
          status,
        };
      }

      await this.remoteCreator.create();

      const completedAt: Date = this.now();

      await this.stateService.markSuccessful(completedAt);

      const completedStatus: BackupAutomaticStatus = await this.stateService.getStatus(
        completedAt,
        appData.backupAutomaticTime,
      );

      return {
        outcome: 'created',
        status: completedStatus,
      };
    } finally {
      this.running = false;
    }
  }
}
