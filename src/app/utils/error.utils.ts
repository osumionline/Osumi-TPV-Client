const IPC_REMOTE_ERROR_PREFIX: RegExp = /^Error invoking remote method '[^']+': (?:Error: )?/;

/**
 * Obtiene un mensaje legible a partir de un error desconocido.
 *
 * Si el valor es una instancia de Error, conserva su mensaje
 * eliminando, cuando exista, el envoltorio técnico añadido
 * por Electron al propagar un error mediante ipcRenderer.invoke().
 *
 * Para valores que no sean Error:
 * - utiliza el fallback cuando se proporciona;
 * - en caso contrario conserva el comportamiento de String(error).
 */
export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  if (error instanceof Error) {
    return normalizeErrorMessage(error.message);
  }

  return fallbackMessage ?? String(error);
}

function normalizeErrorMessage(message: string): string {
  return message.replace(IPC_REMOTE_ERROR_PREFIX, '');
}
