import type DatabaseSnapshot from '@backend/contracts/backup/database-snapshot.interface';
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
   * Crea el proveedor sobre la base SQLite
   * operativa de la aplicación.
   */
  constructor(private readonly sourceDatabaseFile: string) {}

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
        sourceDatabase.close();
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
    } catch {
      return;
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
   * Elimina un temporal sin ocultar
   * el error original de la operación.
   */
  private async removeTemporaryFileSafely(temporaryFile: string): Promise<void> {
    try {
      await rm(temporaryFile, {
        force: true,
      });
    } catch (cleanupError: unknown) {
      console.error(
        ['No se ha podido limpiar', 'el snapshot SQLite temporal:'].join(' '),
        cleanupError,
      );
    }
  }
}
