import type BackupAutomaticStateRepository from '@backend/contracts/backup/backup-automatic-state.repository.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type BackupAutomaticState from '@backend/domain/backup/backup-automatic-state.interface';
import writeAtomicTextFile from '@infrastructure/filesystem/write-atomic-text-file';
import { readFile, rm } from 'node:fs/promises';

/**
 * Comprueba si un error representa un fichero inexistente.
 */
function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/**
 * Comprueba que una fecha persistida sea un ISO UTC
 * canónico generado por Date.toISOString().
 */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const date: Date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Comprueba la estructura exacta del estado persistido.
 */
function isBackupAutomaticState(value: unknown): value is BackupAutomaticState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  return data['schemaVersion'] === 1 && isIsoDate(data['lastSuccessfulAt']);
}

/**
 * Persiste el estado operativo local de las
 * copias remotas automáticas.
 */
export default class JsonBackupAutomaticStateRepository implements BackupAutomaticStateRepository {
  /**
   * Crea el repositorio para el fichero indicado.
   */
  constructor(
    private readonly filePath: string,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Recupera el último estado válido.
   *
   * Un fichero ausente o corrupto se interpreta como
   * ausencia de estado para no impedir la protección
   * automática del terminal.
   */
  async load(): Promise<BackupAutomaticState | null> {
    let content: string;

    try {
      content = await readFile(this.filePath, {
        encoding: 'utf8',
      });
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'load-automatic-backup-state',
        message: 'El estado persistido de las copias automáticas contiene un JSON no válido.',
        error,
      });

      return null;
    }

    if (!isBackupAutomaticState(parsed)) {
      this.applicationLogger.warn({
        area: 'backup',
        operation: 'load-automatic-backup-state',
        message: 'El estado persistido de las copias automáticas tiene una estructura no válida.',
      });

      return null;
    }

    return parsed;
  }

  /**
   * Guarda el estado mediante escritura atómica
   * con un temporal exclusivo para cada operación.
   */
  async save(state: BackupAutomaticState): Promise<void> {
    const content: string = `${JSON.stringify(state, null, 2)}\n`;

    await writeAtomicTextFile(this.filePath, content);
  }

  /**
   * Elimina el estado y cualquier temporal
   * que pudiera haber quedado pendiente.
   */
  async delete(): Promise<void> {
    await Promise.all([
      rm(this.filePath, {
        force: true,
      }),

      rm(`${this.filePath}.tmp`, {
        force: true,
      }),
    ]);
  }
}
