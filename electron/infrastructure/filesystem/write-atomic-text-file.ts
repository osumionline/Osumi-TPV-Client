import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import { open, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const pendingWrites: Map<string, Promise<void>> = new Map<string, Promise<void>>();

const RENAME_RETRY_DELAYS_MS: readonly number[] = [25, 50, 100, 200, 400];

/**
 * Escribe texto de forma atómica.
 *
 * Las escrituras sobre un mismo destino se serializan
 * dentro del proceso. Los destinos independientes
 * pueden escribirse concurrentemente.
 */
export default async function writeAtomicTextFile(
  filePath: string,
  content: string,
): Promise<void> {
  const destination: string = resolve(filePath);

  const key: string = process.platform === 'win32' ? destination.toLowerCase() : destination;

  const previous: Promise<void> = pendingWrites.get(key) ?? Promise.resolve();

  const operation: Promise<void> = previous.then((): Promise<void> =>
    writeAtomicTextFileInternal(destination, content),
  );

  /*
   * La cola debe continuar aunque una escritura falle.
   *
   * El error original sigue propagándose al llamante
   * a través de operation.
   */
  const tail: Promise<void> = operation.then(
    (): void => undefined,
    (): void => undefined,
  );

  pendingWrites.set(key, tail);

  try {
    await operation;
  } finally {
    if (pendingWrites.get(key) === tail) {
      pendingWrites.delete(key);
    }
  }
}

/**
 * Escribe mediante un temporal exclusivo y lo
 * promociona al destino únicamente al finalizar.
 */
async function writeAtomicTextFileInternal(filePath: string, content: string): Promise<void> {
  const temporaryFilePath: string = `${filePath}.${randomUUID()}.tmp`;

  /*
   * La apertura exclusiva determina cuándo
   * adquirimos la propiedad del temporal.
   */
  const fileHandle: FileHandle = await open(temporaryFilePath, 'wx', 0o600);

  try {
    try {
      await fileHandle.writeFile(content, {
        encoding: 'utf8',
      });
    } finally {
      await fileHandle.close();
    }

    await renameWithRetry(temporaryFilePath, filePath);
  } catch (error: unknown) {
    try {
      await rm(temporaryFilePath, {
        force: true,
      });
    } catch (cleanupError: unknown) {
      throw new AggregateError(
        [error, cleanupError],
        'No se ha podido guardar el archivo ni limpiar su temporal.',
        {
          cause: cleanupError,
        },
      );
    }

    throw error;
  }
}

/**
 * Promociona el temporal mediante rename.
 *
 * Los bloqueos transitorios del sistema de archivos
 * se reintentan de forma limitada, sin eliminar
 * previamente el fichero de destino.
 */
async function renameWithRetry(source: string, destination: string): Promise<void> {
  let attempt: number = 0;

  while (true) {
    try {
      await rename(source, destination);

      return;
    } catch (error: unknown) {
      const delay: number | undefined = RENAME_RETRY_DELAYS_MS[attempt];

      if (delay === undefined || !isRetryableRenameError(error)) {
        throw error;
      }

      attempt += 1;

      await setTimeout(delay);
    }
  }
}

/**
 * Identifica errores de promoción compatibles
 * con un bloqueo temporal del sistema de archivos.
 */
function isRetryableRenameError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'EACCES';
}
