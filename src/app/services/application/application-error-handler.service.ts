import { ErrorHandler, inject, Service } from '@angular/core';
import ApplicationLoggingService from '@services/application/application-logging.service';

/**
 * Captura los errores no controlados que Angular
 * y sus listeners globales entregan al ErrorHandler.
 *
 * Los errores controlados por cada flujo deben seguir
 * tratándose en su punto de origen para conservar
 * contexto funcional suficiente.
 */
@Service()
export default class ApplicationErrorHandler implements ErrorHandler {
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);

  /**
   * Registra un error no controlado del Renderer.
   *
   * Conservamos también la salida de consola para
   * mantener el comportamiento útil durante desarrollo.
   */
  handleError(error: unknown): void {
    this.loggingService.error({
      area: 'application',
      operation: 'unhandled-renderer-error',
      message: 'Se ha producido un error no controlado en el Renderer.',
      error,
    });

    console.error('Error no controlado en Renderer:', error);
  }
}
