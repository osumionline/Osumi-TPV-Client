import type { RendererLogCommand } from '@desktop-contracts/logging/renderer-log-command';

/**
 * API expuesta al Renderer para enviar
 * entradas al logger persistente de Main.
 */
export default interface LoggingApi {
  write(command: RendererLogCommand): Promise<void>;
}
