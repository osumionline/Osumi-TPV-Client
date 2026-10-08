import type { NormalizedApplicationError } from '@backend/domain/logging/application-log.types';

/**
 * Convierte errores desconocidos en una estructura
 * segura, limitada y serializable para el log.
 *
 * Nunca recorre propiedades arbitrarias del objeto
 * recibido y, por tanto, no serializa automáticamente
 * requests, respuestas, credenciales ni payloads.
 */
export default class ApplicationErrorNormalizer {
  private static readonly MAX_CAUSE_DEPTH: number = 4;
  private static readonly MAX_AGGREGATE_ERRORS: number = 5;

  private static readonly MAX_NAME_LENGTH: number = 200;
  private static readonly MAX_MESSAGE_LENGTH: number = 4_096;
  private static readonly MAX_STACK_LENGTH: number = 16_384;

  /**
   * Normaliza un error desconocido.
   */
  normalize(error: unknown): NormalizedApplicationError {
    return this.normalizeValue(error, 0);
  }

  /**
   * Normaliza recursivamente un Error sin inspeccionar
   * ninguna propiedad ajena al contrato estándar.
   */
  private normalizeValue(value: unknown, depth: number): NormalizedApplicationError {
    if (!(value instanceof Error)) {
      return {
        name: 'UnknownError',
        message: 'Se ha recibido un valor de error no representado mediante Error.',
        stack: null,
        cause: null,
        errors: null,
      };
    }

    const name: string = this.normalizeRequiredText(
      value.name,
      'Error',
      ApplicationErrorNormalizer.MAX_NAME_LENGTH,
    );

    const message: string = this.normalizeRequiredText(
      value.message,
      'Error sin mensaje.',
      ApplicationErrorNormalizer.MAX_MESSAGE_LENGTH,
    );

    const stack: string | null =
      typeof value.stack === 'string' && value.stack.trim() !== ''
        ? this.sanitizeAndLimit(value.stack, ApplicationErrorNormalizer.MAX_STACK_LENGTH)
        : null;

    if (depth >= ApplicationErrorNormalizer.MAX_CAUSE_DEPTH) {
      return {
        name,
        message,
        stack,
        cause: null,
        errors: null,
      };
    }

    const cause: NormalizedApplicationError | null =
      value.cause === undefined ? null : this.normalizeValue(value.cause, depth + 1);

    return {
      name,
      message,
      stack,
      cause,
      errors: this.normalizeAggregateErrors(value, depth),
    };
  }

  /**
   * Conserva los errores internos de AggregateError
   * aplicando los mismos límites de seguridad.
   */
  private normalizeAggregateErrors(
    error: Error,
    depth: number,
  ): readonly NormalizedApplicationError[] | null {
    if (!(error instanceof AggregateError)) {
      return null;
    }

    const rawErrors: unknown = error.errors;

    if (!Array.isArray(rawErrors) || rawErrors.length === 0) {
      return [];
    }

    return rawErrors
      .slice(0, ApplicationErrorNormalizer.MAX_AGGREGATE_ERRORS)
      .map((aggregateError: unknown): NormalizedApplicationError =>
        this.normalizeValue(aggregateError, depth + 1),
      );
  }

  /**
   * Normaliza un texto obligatorio y utiliza
   * un fallback cuando queda vacío.
   */
  private normalizeRequiredText(value: string, fallback: string, maxLength: number): string {
    const normalized: string = this.sanitizeAndLimit(value, maxLength).trim();

    return normalized === '' ? fallback : normalized;
  }

  /**
   * Elimina patrones evidentes de credenciales
   * y limita el tamaño máximo almacenado.
   *
   * Esta protección es complementaria:
   * la regla principal sigue siendo no entregar
   * secretos ni objetos arbitrarios al logger.
   */
  private sanitizeAndLimit(value: string, maxLength: number): string {
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
