import { randomUUID } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';

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

  let temporaryFileCreated: boolean = false;

  try {
    await writeFile(temporaryFilePath, content, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });

    temporaryFileCreated = true;

    await rename(temporaryFilePath, filePath);
  } catch (error: unknown) {
    if (temporaryFileCreated) {
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
    }

    throw error;
  }
}
