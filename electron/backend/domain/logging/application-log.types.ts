/**
 * Severidad de una entrada del log.
 */
export type ApplicationLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Proceso lógico desde el que se originó
 * una entrada del log.
 */
export type ApplicationLogSource = 'main' | 'renderer';

/**
 * Valor simple permitido dentro del contexto
 * adicional de una entrada de log.
 *
 * El contexto no admite objetos ni arrays para evitar
 * serializar accidentalmente estructuras operativas,
 * credenciales o payloads completos.
 */
export type ApplicationLogContextValue = string | number | boolean | null;

/**
 * Contexto técnico explícito asociado a una entrada.
 *
 * Todos sus valores deben seleccionarse expresamente
 * en el punto desde el que se registra la incidencia.
 */
export type ApplicationLogContext = Readonly<Record<string, ApplicationLogContextValue>>;

/**
 * Evento que una capa de aplicación solicita registrar.
 *
 * El error todavía puede ser unknown porque su
 * normalización pertenece al logger.
 *
 * source se omite en los eventos normales de Main.
 * El bridge de Renderer lo indicará explícitamente
 * cuando se integre su canal IPC.
 */
export interface ApplicationLogEvent {
  readonly source?: ApplicationLogSource;
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
  readonly context?: ApplicationLogContext;
}

/**
 * Representación segura y serializable de un Error.
 *
 * No contiene propiedades arbitrarias del objeto original.
 */
export interface NormalizedApplicationError {
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
  readonly cause: NormalizedApplicationError | null;
  readonly errors: readonly NormalizedApplicationError[] | null;
}

/**
 * Registro definitivo preparado para persistirse
 * como una línea JSON independiente.
 */
export interface ApplicationLogRecord {
  readonly schemaVersion: 1;
  readonly timestamp: string;
  readonly level: ApplicationLogLevel;
  readonly source: ApplicationLogSource;
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly appVersion: string;
  readonly context: ApplicationLogContext | null;
  readonly error: NormalizedApplicationError | null;
}
