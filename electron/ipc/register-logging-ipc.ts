import RendererLogCommandValidator from '@backend/application/logging/renderer-log-command.validator';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  RendererLogCommand,
  RendererLogError,
} from '@desktop-contracts/logging/renderer-log-command';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra el único bridge mediante el que Renderer
 * puede solicitar entradas al logger persistente de Main.
 */
export default function registerLoggingIpc(
  getMainWindow: MainWindowProvider,
  applicationLogger: ApplicationLogger,
  validator: RendererLogCommandValidator = new RendererLogCommandValidator(),
): void {
  ipcMain.handle(IPC_CHANNELS.loggingWrite, (event, value: unknown): void => {
    assertTrustedSender(event, getMainWindow);

    const command: RendererLogCommand = validator.validate(value);

    const logEvent: ApplicationLogEvent = {
      source: 'renderer',
      area: command.area,
      operation: command.operation,
      message: command.message,
      context: command.context ?? undefined,
      error: command.error === null ? undefined : restoreRendererError(command.error),
    };

    switch (command.level) {
      case 'debug':
        applicationLogger.debug(logEvent);
        return;

      case 'info':
        applicationLogger.info(logEvent);
        return;

      case 'warn':
        applicationLogger.warn(logEvent);
        return;

      case 'error':
        applicationLogger.error(logEvent);
    }
  });
}

/**
 * Reconstruye exclusivamente la parte estándar
 * y previamente validada del Error recibido.
 */
function restoreRendererError(payload: RendererLogError): Error {
  const cause: Error | undefined =
    payload.cause === null ? undefined : restoreRendererError(payload.cause);

  const options: ErrorOptions | undefined =
    cause === undefined
      ? undefined
      : {
          cause,
        };

  let error: Error;

  if (payload.errors === null) {
    error = new Error(payload.message, options);
  } else {
    error = new AggregateError(
      payload.errors.map((aggregateError: RendererLogError): Error =>
        restoreRendererError(aggregateError),
      ),
      payload.message,
      options,
    );
  }

  error.name = payload.name;

  if (payload.stack !== null) {
    error.stack = payload.stack;
  }

  return error;
}
