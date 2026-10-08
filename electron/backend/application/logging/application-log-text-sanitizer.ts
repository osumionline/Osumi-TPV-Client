/**
 * Elimina patrones evidentes de credenciales
 * de los textos destinados al log y limita
 * su longitud máxima.
 *
 * Esta clase es únicamente una barrera defensiva.
 * La protección principal sigue siendo no entregar
 * secretos ni objetos arbitrarios al sistema de logging.
 */
export default class ApplicationLogTextSanitizer {
  /**
   * Sanitiza y limita un texto antes
   * de incorporarlo al log.
   */
  sanitize(value: string, maxLength: number): string {
    if (!Number.isSafeInteger(maxLength) || maxLength <= 0) {
      throw new RangeError('La longitud máxima del texto de log no es válida.');
    }

    const sanitized: string = value
      .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(
        /\b(?:authorization|token|secret|secretApi|backupApiKey|password|pass|contraseña)\s*[:=]\s*[^\s,;]+/giu,
        (match: string): string => {
          const separatorIndex: number = Math.max(match.indexOf(':'), match.indexOf('='));

          if (separatorIndex === -1) {
            return '[REDACTED]';
          }

          return `${match.slice(0, separatorIndex + 1)}[REDACTED]`;
        },
      )
      .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]');

    if (sanitized.length <= maxLength) {
      return sanitized;
    }

    return `${sanitized.slice(0, maxLength - 1)}…`;
  }
}
