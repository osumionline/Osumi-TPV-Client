/**
 * Obtiene un mensaje legible a partir de un error desconocido.
 *
 * Si el valor es una instancia de Error, conserva su mensaje.
 *
 * Para valores que no sean Error:
 * - utiliza el fallback cuando se proporciona;
 * - en caso contrario conserva el comportamiento de String(error).
 */
export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage ?? String(error);
}
