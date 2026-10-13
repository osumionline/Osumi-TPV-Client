import type DatabaseSnapshot from '@backend/contracts/backup/database-snapshot.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import hasFileSystemErrorCode from '@infrastructure/filesystem/filesystem-error.utils';
import type RemoveTemporaryFile from '@infrastructure/filesystem/remove-temporary-file.type';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Crea snapshots consistentes utilizando
 * la Online Backup API de SQLite.
 */
export default class BetterSqlite3DatabaseSnapshot implements DatabaseSnapshot {
  /**
   * Crea el proveedor sobre la base SQLite operativa,
   * con logging de incidencias de limpieza temporal.
   */
  constructor(
    private readonly sourceDatabaseFile: string,
    private readonly applicationLogger: ApplicationLogger,
    private readonly removeFile: RemoveTemporaryFile = rm,
  ) {}

  /**
   * Crea una copia SQLite consistente y autocontenida
   * sin copiar directamente los ficheros WAL/SHM.
   */
  async create(destinationFile: string): Promise<void> {
    this.assertDifferentPaths(destinationFile);

    await this.assertDestinationDoesNotExist(destinationFile);

    const destinationDirectory: string = dirname(destinationFile);

    await mkdir(destinationDirectory, {
      recursive: true,
    });

    const temporaryFile: string = join(destinationDirectory, `.sqlite-backup-${randomUUID()}.tmp`);

    let sourceDatabase: Database.Database | null = null;

    try {
      sourceDatabase = this.openSourceDatabase();

      await sourceDatabase.backup(temporaryFile);

      await this.assertSnapshotCreated(temporaryFile);

      await rename(temporaryFile, destinationFile);
    } catch (error: unknown) {
      await this.removeTemporaryFileSafely(temporaryFile);

      throw new Error('No se ha podido crear el snapshot SQLite de la copia de seguridad.', {
        cause: error,
      });
    } finally {
      if (sourceDatabase !== null) {
        this.closeSourceDatabaseSafely(sourceDatabase);
      }
    }
  }

  /**
   * Abre la base origen en modo de solo lectura.
   *
   * La Online Backup API seguirá incluyendo
   * correctamente los cambios confirmados presentes
   * en WAL.
   */
  private openSourceDatabase(): Database.Database {
    return new Database(this.sourceDatabaseFile, {
      readonly: true,
      fileMustExist: true,
    });
  }

  /**
   * Cierra la conexión SQLite utilizada para el snapshot.
   *
   * Un fallo durante el cierre se registra como incidencia
   * secundaria, sin ocultar un error anterior ni alterar
   * el resultado de la operación principal.
   */
  private closeSourceDatabaseSafely(sourceDatabase: Database.Database): void {
    try {
      sourceDatabase.close();
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'backup-sqlite-snapshot-close',
        message: 'No se ha podido cerrar la conexión SQLite utilizada para generar el snapshot.',
        error,
      });
    }
  }

  /**
   * Impide utilizar la propia base operativa
   * como destino del snapshot.
   */
  private assertDifferentPaths(destinationFile: string): void {
    if (resolve(this.sourceDatabaseFile) === resolve(destinationFile)) {
      throw new Error(
        ['La base de datos origen', 'no puede utilizarse como destino del snapshot.'].join(' '),
      );
    }
  }

  /**
   * Evita sobrescribir silenciosamente
   * un fichero existente.
   */
  private async assertDestinationDoesNotExist(destinationFile: string): Promise<void> {
    try {
      await access(destinationFile);
    } catch (error: unknown) {
      if (hasFileSystemErrorCode(error, 'ENOENT')) {
        return;
      }

      throw error;
    }

    throw new Error('El fichero de destino del snapshot ya existe.');
  }

  /**
   * Comprueba que SQLite haya materializado
   * un fichero de snapshot no vacío.
   */
  private async assertSnapshotCreated(snapshotFile: string): Promise<void> {
    const snapshotStats = await stat(snapshotFile);

    if (!snapshotStats.isFile() || snapshotStats.size === 0) {
      throw new Error('SQLite no ha generado un snapshot válido.');
    }
  }

  /**
   * Elimina el snapshot temporal sin ocultar
   * el error principal de creación.
   *
   * Los fallos secundarios de cleanup quedan
   * registrados sin incluir rutas físicas.
   */
  private async removeTemporaryFileSafely(temporaryFile: string): Promise<void> {
    try {
      await this.removeFile(temporaryFile, {
        force: true,
      });
    } catch (cleanupError: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'backup-sqlite-snapshot-temp-cleanup',
        message: 'No se ha podido limpiar el snapshot SQLite temporal de una copia de seguridad.',
        error: cleanupError,
      });
    }
  }
}
