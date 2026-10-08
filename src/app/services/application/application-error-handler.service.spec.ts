import { TestBed } from '@angular/core/testing';
import ApplicationErrorHandler from '@services/application/application-error-handler.service';
import ApplicationLoggingService from '@services/application/application-logging.service';
import { vi } from 'vitest';

class TestApplicationLoggingService {
  readonly errors: unknown[] = [];

  /**
   * Conserva las entradas recibidas.
   */
  error(event: unknown): void {
    this.errors.push(event);
  }
}

describe('ApplicationErrorHandler', (): void => {
  let loggingService: TestApplicationLoggingService;

  beforeEach((): void => {
    loggingService = new TestApplicationLoggingService();

    TestBed.configureTestingModule({
      providers: [
        ApplicationErrorHandler,
        {
          provide: ApplicationLoggingService,
          useValue: loggingService,
        },
      ],
    });
  });

  afterEach((): void => {
    vi.restoreAllMocks();

    TestBed.resetTestingModule();
  });

  it('envía los errores no controlados al logger del Renderer', (): void => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    const handler: ApplicationErrorHandler = TestBed.inject(ApplicationErrorHandler);

    const error: Error = new Error('Fallo inesperado.');

    handler.handleError(error);

    expect(loggingService.errors).toEqual([
      {
        area: 'application',
        operation: 'unhandled-renderer-error',
        message: 'Se ha producido un error no controlado en el Renderer.',
        error,
      },
    ]);

    expect(consoleError).toHaveBeenCalledWith('Error no controlado en Renderer:', error);
  });

  it('acepta valores desconocidos sin intentar interpretarlos', (): void => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    const handler: ApplicationErrorHandler = TestBed.inject(ApplicationErrorHandler);

    const error: unknown = {
      token: 'valor-que-no-debe-serializarse-aqui',
    };

    expect((): void => {
      handler.handleError(error);
    }).not.toThrow();

    expect(loggingService.errors).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
