import { Service } from '@angular/core';
import type {
  RendererLogCommand,
  RendererLogContext,
  RendererLogContextValue,
  RendererLogError,
  RendererLogLevel,
} from '@desktop-contracts/logging/renderer-log-command';

/**
 * Evento que el código Angular solicita registrar.
 *
 * Solo admite contexto escalar explícito.
 */
interface ApplicationLoggingEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly context?: RendererLogContext;
  readonly error?: unknown;
}

/**
 * Bridge Angular hacia el único logger persistente
 * que vive en el proceso Main de Electron.
 */
@Service()
export default class ApplicationLoggingService {
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
   * Registra información detallada de diagnóstico.
   */
  debug(event: ApplicationLoggingEvent): void {
    this.write('debug', event);
  }

  /**
   * Registra un hito operativo relevante.
   */
  info(event: ApplicationLoggingEvent): void {
    this.write('info', event);
  }

  /**
   * Registra una incidencia recuperable.
   */
  warn(event: ApplicationLoggingEvent): void {
    this.write('warn', event);
  }

  /**
   * Registra el fallo de una operación.
   */
  error(event: ApplicationLoggingEvent): void {
    this.write('error', event);
  }

  /**
   * Construye y envía una entrada al bridge de Main.
   *
   * El logging es siempre best-effort:
   * un fallo del propio bridge nunca se propaga
   * al flujo funcional que intentaba registrar.
   */
  private write(level: RendererLogLevel, event: ApplicationLoggingEvent): void {
    try {
      const command: RendererLogCommand = {
        level,
        area: this.normalizeRequiredText(
          event.area,
          'application',
          ApplicationLoggingService.MAX_AREA_LENGTH,
        ),
        operation: this.normalizeRequiredText(
          event.operation,
          'unknown',
          ApplicationLoggingService.MAX_OPERATION_LENGTH,
        ),
        message: this.normalizeRequiredText(
          event.message,
          'Entrada de log sin mensaje.',
          ApplicationLoggingService.MAX_MESSAGE_LENGTH,
        ),
        context: this.normalizeContext(event.context),
        error: event.error === undefined ? null : this.normalizeError(event.error, 0),
      };

      void window.osumiDesktop.logging.write(command).catch((error: unknown): void => {
        this.reportLoggingFailure(error);
      });
    } catch (error: unknown) {
      this.reportLoggingFailure(error);
    }
  }

  /**
   * Normaliza el contexto explícito antes
   * de atravesar la frontera IPC.
   */
  private normalizeContext(
    context: RendererLogContext | null | undefined,
  ): RendererLogContext | null {
    if (context === undefined || context === null) {
      return null;
    }

    const normalized: Record<string, RendererLogContextValue> = {};

    const entries = Object.entries(context).slice(0, ApplicationLoggingService.MAX_CONTEXT_ENTRIES);

    for (const [rawKey, rawValue] of entries) {
      const key: string = this.limitText(
        rawKey,
        ApplicationLoggingService.MAX_CONTEXT_KEY_LENGTH,
      ).trim();

      if (key === '') {
        continue;
      }

      if (typeof rawValue === 'string') {
        normalized[key] = this.limitText(
          rawValue,
          ApplicationLoggingService.MAX_CONTEXT_STRING_LENGTH,
        );

        continue;
      }

      if (typeof rawValue === 'number' && !Number.isFinite(rawValue)) {
        normalized[key] = null;

        continue;
      }

      normalized[key] = rawValue;
    }

    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  /**
   * Convierte un error desconocido en el contrato
   * serializable permitido por Renderer → Main.
   */
  private normalizeError(value: unknown, depth: number): RendererLogError {
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
      ApplicationLoggingService.MAX_ERROR_NAME_LENGTH,
    );

    const message: string = this.normalizeRequiredText(
      value.message,
      'Error sin mensaje.',
      ApplicationLoggingService.MAX_ERROR_MESSAGE_LENGTH,
    );

    const stack: string | null =
      typeof value.stack === 'string' && value.stack.trim() !== ''
        ? this.limitText(value.stack, ApplicationLoggingService.MAX_ERROR_STACK_LENGTH)
        : null;

    if (depth >= ApplicationLoggingService.MAX_ERROR_DEPTH) {
      return {
        name,
        message,
        stack,
        cause: null,
        errors: null,
      };
    }

    const cause: RendererLogError | null =
      value.cause === undefined ? null : this.normalizeError(value.cause, depth + 1);

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
   * dentro de los límites permitidos por el IPC.
   */
  private normalizeAggregateErrors(
    error: Error,
    depth: number,
  ): readonly RendererLogError[] | null {
    if (!(error instanceof AggregateError)) {
      return null;
    }

    const rawErrors: unknown = error.errors;

    if (!Array.isArray(rawErrors) || rawErrors.length === 0) {
      return [];
    }

    return rawErrors
      .slice(0, ApplicationLoggingService.MAX_AGGREGATE_ERRORS)
      .map((aggregateError: unknown): RendererLogError =>
        this.normalizeError(aggregateError, depth + 1),
      );
  }

  /**
   * Normaliza un texto obligatorio y utiliza
   * un fallback cuando queda vacío.
   */
  private normalizeRequiredText(value: string, fallback: string, maxLength: number): string {
    const normalized: string = this.limitText(value, maxLength).trim();

    return normalized === '' ? fallback : normalized;
  }

  /**
   * Limita un texto para que nunca sea rechazado
   * posteriormente por el validador IPC.
   */
  private limitText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1)}…`;
  }

  /**
   * Último recurso cuando el propio bridge
   * de logging de Renderer falla.
   *
   * Nunca relanza la incidencia.
   */
  private reportLoggingFailure(error: unknown): void {
    console.error('No se ha podido enviar una entrada de log desde Renderer:', error);
  }
}
