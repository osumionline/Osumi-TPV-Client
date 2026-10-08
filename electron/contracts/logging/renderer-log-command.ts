/**
 * Severidades que el Renderer puede solicitar
 * registrar mediante el bridge de logging.
 */
export type RendererLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Valor escalar admitido dentro del contexto
 * explícito enviado desde Renderer.
 */
export type RendererLogContextValue = string | number | boolean | null;

/**
 * Contexto seguro transportable mediante IPC.
 */
export type RendererLogContext = Readonly<Record<string, RendererLogContextValue>>;

/**
 * Representación serializable de un Error originado
 * en Renderer.
 *
 * Nunca contiene propiedades arbitrarias del Error.
 */
export interface RendererLogError {
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
  readonly cause: RendererLogError | null;
  readonly errors: readonly RendererLogError[] | null;
}

/**
 * Comando completo enviado desde Renderer
 * al único escritor de logs situado en Main.
 */
export interface RendererLogCommand {
  readonly level: RendererLogLevel;
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly context: RendererLogContext | null;
  readonly error: RendererLogError | null;
}
