import { TestBed } from '@angular/core/testing';
import type ReservaInterface from '@desktop-contracts/ventas/reservas/reserva.interface';
import ApplicationLoggingService from '@services/application/application-logging.service';
import ReservasService from '@services/ventas/reservas.service';

interface TestLogEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
}

/**
 * Logger controlado utilizado por los tests
 * del servicio de reservas.
 */
class TestApplicationLoggingService {
  readonly warnEvents: TestLogEvent[] = [];

  /**
   * Conserva los avisos solicitados por el servicio.
   */
  warn(event: TestLogEvent): void {
    this.warnEvents.push(event);
  }
}

describe('ReservasService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let loggingService: TestApplicationLoggingService;
  let getAllError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    loggingService = new TestApplicationLoggingService();
    getAllError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        reservas: {
          getAll: (): Promise<readonly ReservaInterface[]> =>
            getAllError === null ? Promise.resolve([]) : Promise.reject(getAllError),
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        ReservasService,
        {
          provide: ApplicationLoggingService,
          useValue: loggingService,
        },
      ],
    });
  });

  afterEach((): void => {
    TestBed.resetTestingModule();

    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('carga las reservas sin generar avisos cuando la consulta termina correctamente', async (): Promise<void> => {
    const service: ReservasService = TestBed.inject(ReservasService);

    await service.load();

    expect(service.loaded()).toBe(true);
    expect(service.error()).toBeNull();
    expect(loggingService.warnEvents).toEqual([]);
  });

  it('registra un aviso si no puede cargar las reservas', async (): Promise<void> => {
    const error: Error = new Error('SQLite read failed.');

    getAllError = error;

    const service: ReservasService = TestBed.inject(ReservasService);

    await service.reload();

    expect(service.loaded()).toBe(false);
    expect(service.error()).toBe('SQLite read failed.');

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'load-reservations',
        message: 'No se han podido cargar las reservas.',
        error,
      },
    ]);
  });
});
