import { TestBed } from '@angular/core/testing';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';
import ApplicationLoggingService from '@services/application/application-logging.service';
import VentasContextService from '@services/ventas/ventas-context.service';

interface TestLogEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
  readonly context?: Readonly<Record<string, string | number | boolean | null>>;
}

describe('VentasContextService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let loggingService: TestApplicationLoggingService;
  let contextError: Error | null;
  let openError: Error | null;
  let contextResult: VentasContextInterface;
  let openResult: CajaAbiertaInterface;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    loggingService = new TestApplicationLoggingService();
    contextError = null;
    openError = null;
    contextResult = createContext();
    openResult = createCajaAbierta();

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        ventas: {
          getContext: (): Promise<VentasContextInterface> =>
            contextError === null ? Promise.resolve(contextResult) : Promise.reject(contextError),
        },
        caja: {
          open: (): Promise<CajaAbiertaInterface> =>
            openError === null ? Promise.resolve(openResult) : Promise.reject(openError),
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        VentasContextService,
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

  it('registra un error si no puede cargar el contexto operativo', async (): Promise<void> => {
    const error: Error = new Error('SQLite no disponible.');

    contextError = error;

    const service: VentasContextService = TestBed.inject(VentasContextService);

    await expect(service.load()).rejects.toBe(error);

    expect(service.loaded()).toBe(false);
    expect(service.error()).toBe('SQLite no disponible.');

    expect(loggingService.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'load-context',
        message: 'No se ha podido cargar el contexto operativo de Ventas.',
        error,
      },
    ]);
  });

  it('registra un error si falla la apertura de caja', async (): Promise<void> => {
    const error: Error = new Error('No se ha podido crear la caja.');

    openError = error;

    const service: VentasContextService = TestBed.inject(VentasContextService);

    await service.load();

    await expect(service.abrirCaja()).rejects.toBe(error);

    expect(service.cajaAbierta()).toBeNull();
    expect(service.openingCaja()).toBe(false);
    expect(service.error()).toBe('No se ha podido crear la caja.');

    expect(loggingService.errorEvents).toEqual([
      {
        area: 'caja',
        operation: 'open-cash-register',
        message: 'No se ha podido abrir la caja del terminal actual.',
        error,
        context: {
          terminalPublicId: 'terminal-public-id',
        },
      },
    ]);
  });

  it('no registra una precondición local como fallo técnico', async (): Promise<void> => {
    const service: VentasContextService = TestBed.inject(VentasContextService);

    await expect(service.abrirCaja()).rejects.toThrow(
      'No se puede abrir la caja sin haber cargado el contexto operativo.',
    );

    expect(loggingService.errorEvents).toEqual([]);
  });
});

/**
 * Logger controlado utilizado por los tests
 * del contexto operativo de Ventas.
 */
class TestApplicationLoggingService {
  readonly errorEvents: TestLogEvent[] = [];

  /**
   * Conserva los errores solicitados por el servicio.
   */
  error(event: TestLogEvent): void {
    this.errorEvents.push(event);
  }
}

/**
 * Construye el contexto operativo mínimo
 * necesario para los tests.
 */
function createContext(): VentasContextInterface {
  return {
    appData: createAppData(),
    terminal: {
      id: 1,
      publicId: 'terminal-public-id',
      nombre: 'Terminal principal',
      codigo: 'TPV01',
    },
    cajaAbierta: null,
    tiposPago: [
      {
        id: 1,
        publicId: 'efectivo-public-id',
        nombre: 'Efectivo',
        slug: 'efectivo',
        foto: null,
        afectaCaja: true,
        orden: 1,
        fisico: true,
      },
    ],
  };
}

/**
 * Construye una caja abierta simulada.
 */
function createCajaAbierta(): CajaAbiertaInterface {
  return {
    id: 1,
    publicId: 'caja-public-id',
    idTerminal: 1,
    apertura: '2026-10-08T20:00:00.000Z',
    importeAperturaCents: 0,
  };
}

/**
 * Construye la configuración mínima completa
 * requerida por el contrato público.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-10-08T08:00:00.000Z',
    nombre: 'Tienda',
    nombreComercial: 'Tienda',
    cif: '',
    telefono: '',
    direccion: '',
    poblacion: '',
    email: '',
    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Adjuntamos el ticket correspondiente a su compra.',
    },
    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    backupAutomaticTime: '03:00',
    fechaCad: false,
  };
}
