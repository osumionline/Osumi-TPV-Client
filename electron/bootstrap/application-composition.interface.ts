import type BackupAutomaticSchedulerService from '@backend/application/backup/backup-automatic-scheduler.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';

/**
 * Servicios cuyo ciclo de vida pertenece
 * al proceso principal de Electron.
 */
export default interface ApplicationComposition {
  readonly applicationDatabase: TypeOrmApplicationDatabase;
  readonly applicationLogger: ApplicationLogger;
  readonly backupAutomaticSchedulerService: BackupAutomaticSchedulerService;
}
