import type {
  RendererLogCommand,
  RendererLogContext,
  RendererLogContextValue,
  RendererLogError,
  RendererLogLevel,
} from '@desktop-contracts/logging/renderer-log-command';

/**
 * Valida la frontera Renderer → Main del logging.
 *
 * Aunque el sender pertenezca a la ventana principal,
 * Main nunca confía directamente en la estructura
 * recibida mediante IPC.
 */
export default class RendererLogCommandValidator {
  private static readonly MAX_AREA_LENGTH: number = 100;
  private static readonly MAX_OPERATION_LENGTH: number = 120;
  private static readonly MAX_MESSAGE_LENGTH: number = 4_096;

  private static readonly MAX_CONTEXT_ENTRIES: number = 32;
  private static readonly MAX_CONTEXT_KEY_LENGTH: number = 100;
  private static readonly MAX_CONTEXT_STRING_LENGTH: number = 4_096;

  private static readonly MAX_ERROR_DEPTH: number = 4;
  private static readonly MAX_AGGREGATE_ERRORS: number = 5;
  private static readonly MAX_ERROR_NAME_LENGTH: number = 200;
  private static readonly MAX_ERROR_MESSAGE_LENGTH: number = 4_096;
  private static readonly MAX_ERROR_STACK_LENGTH: number = 16_384;

  /**
   * Valida y reconstruye un comando canónico.
   */
  validate(value: unknown): RendererLogCommand {
    const record: Record<string, unknown> = this.requireRecord(
      value,
      'El comando de logging no es válido.',
    );

    this.assertExactKeys(record, ['level', 'area', 'operation', 'message', 'context', 'error']);

    return {
      level: this.requireLevel(record['level']),
      area: this.requireText(record['area'], 'area', RendererLogCommandValidator.MAX_AREA_LENGTH),
      operation: this.requireText(
        record['operation'],
        'operation',
        RendererLogCommandValidator.MAX_OPERATION_LENGTH,
      ),
      message: this.requireText(
        record['message'],
        'message',
        RendererLogCommandValidator.MAX_MESSAGE_LENGTH,
      ),
      context: this.validateContext(record['context']),
      error: this.validateError(record['error'], 0),
    };
  }

  /**
   * Valida un contexto compuesto exclusivamente
   * por valores escalares.
   */
  private validateContext(value: unknown): RendererLogContext | null {
    if (value === null) {
      return null;
    }

    const record: Record<string, unknown> = this.requireRecord(
      value,
      'El contexto de logging no es válido.',
    );

    const entries: readonly [string, unknown][] = Object.entries(record);

    if (entries.length > RendererLogCommandValidator.MAX_CONTEXT_ENTRIES) {
      throw new Error('El contexto de logging contiene demasiados campos.');
    }

    const result: Record<string, RendererLogContextValue> = {};

    for (const [key, rawValue] of entries) {
      if (key.trim() === '' || key.length > RendererLogCommandValidator.MAX_CONTEXT_KEY_LENGTH) {
        throw new Error('El contexto de logging contiene una clave no válida.');
      }

      if (rawValue === null || typeof rawValue === 'boolean') {
        result[key] = rawValue;

        continue;
      }

      if (typeof rawValue === 'number') {
        if (!Number.isFinite(rawValue)) {
          throw new Error('El contexto de logging contiene un número no válido.');
        }

        result[key] = rawValue;

        continue;
      }

      if (typeof rawValue === 'string') {
        if (rawValue.length > RendererLogCommandValidator.MAX_CONTEXT_STRING_LENGTH) {
          throw new Error('El contexto de logging contiene un texto demasiado largo.');
        }

        result[key] = rawValue;

        continue;
      }

      throw new Error('El contexto de logging contiene un valor no permitido.');
    }

    return result;
  }

  /**
   * Valida recursivamente un Error serializado
   * procedente del Renderer.
   */
  private validateError(value: unknown, depth: number): RendererLogError | null {
    if (value === null) {
      return null;
    }

    if (depth > RendererLogCommandValidator.MAX_ERROR_DEPTH) {
      throw new Error('El error de logging supera la profundidad máxima permitida.');
    }

    const record: Record<string, unknown> = this.requireRecord(
      value,
      'El error de logging no es válido.',
    );

    this.assertExactKeys(record, ['name', 'message', 'stack', 'cause', 'errors']);

    const rawStack: unknown = record['stack'];

    if (
      rawStack !== null &&
      (typeof rawStack !== 'string' ||
        rawStack.length > RendererLogCommandValidator.MAX_ERROR_STACK_LENGTH)
    ) {
      throw new Error('El stack del error de logging no es válido.');
    }

    const rawErrors: unknown = record['errors'];

    let errors: readonly RendererLogError[] | null = null;

    if (rawErrors !== null) {
      if (
        !Array.isArray(rawErrors) ||
        rawErrors.length > RendererLogCommandValidator.MAX_AGGREGATE_ERRORS
      ) {
        throw new Error('Los errores agregados del log no son válidos.');
      }

      errors = rawErrors.map((error: unknown): RendererLogError => {
        const validated: RendererLogError | null = this.validateError(error, depth + 1);

        if (validated === null) {
          throw new Error('Un error agregado no puede ser null.');
        }

        return validated;
      });
    }

    return {
      name: this.requireText(
        record['name'],
        'error.name',
        RendererLogCommandValidator.MAX_ERROR_NAME_LENGTH,
      ),
      message: this.requireText(
        record['message'],
        'error.message',
        RendererLogCommandValidator.MAX_ERROR_MESSAGE_LENGTH,
      ),
      stack: rawStack,
      cause: this.validateError(record['cause'], depth + 1),
      errors,
    };
  }

  /**
   * Valida una severidad admitida.
   */
  private requireLevel(value: unknown): RendererLogLevel {
    switch (value) {
      case 'debug':
      case 'info':
      case 'warn':
      case 'error':
        return value;

      default:
        throw new Error('El nivel de logging no es válido.');
    }
  }

  /**
   * Exige un texto no vacío y dentro
   * del límite correspondiente.
   */
  private requireText(value: unknown, fieldName: string, maxLength: number): string {
    if (typeof value !== 'string' || value.trim() === '' || value.length > maxLength) {
      throw new Error(`El campo ${fieldName} del log no es válido.`);
    }

    return value;
  }

  /**
   * Exige un objeto simple.
   */
  private requireRecord(value: unknown, errorMessage: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(errorMessage);
    }

    return value as Record<string, unknown>;
  }

  /**
   * Impide transportar propiedades adicionales
   * no contempladas por el contrato.
   */
  private assertExactKeys(record: Record<string, unknown>, expectedKeys: readonly string[]): void {
    const keys: readonly string[] = Object.keys(record);

    if (
      keys.length !== expectedKeys.length ||
      !expectedKeys.every((key: string): boolean => Object.hasOwn(record, key))
    ) {
      throw new Error('El comando de logging contiene una estructura no permitida.');
    }
  }
}
