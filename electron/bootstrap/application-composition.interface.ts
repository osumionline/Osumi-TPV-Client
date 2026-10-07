import type BackupAutomaticExecutionService from '@backend/application/backup/backup-automatic-execution.service';
import type TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';

/**
 * Servicios cuyo ciclo de vida pertenece
 * al proceso principal de Electron.
 */
export default interface ApplicationComposition {
  readonly applicationDatabase: TypeOrmApplicationDatabase;
  readonly backupAutomaticExecutionService: BackupAutomaticExecutionService;
}
