import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import { open, rename, rm } from 'node:fs/promises';

/**
 * Escribe texto mediante un temporal exclusivo y lo
 * promociona al destino únicamente al finalizar.
 *
 * Cada operación utiliza su propio temporal para evitar
 * interferencias con otras escrituras concurrentes.
 */
export default async function writeAtomicTextFile(
  filePath: string,
  content: string,
): Promise<void> {
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

    await rename(temporaryFilePath, filePath);
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
