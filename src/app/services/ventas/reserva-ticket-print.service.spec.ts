import { TestBed } from '@angular/core/testing';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/ventas/reservas/reserva.interface';
import ApplicationLoggingService from '@services/application/application-logging.service';
import ReservaTicketPrintService from '@services/ventas/reserva-ticket-print.service';

interface TestLogEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
  readonly context?: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Logger controlado utilizado por los tests
 * de impresión de comprobantes de reserva.
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

describe('ReservaTicketPrintService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let loggingService: TestApplicationLoggingService;
  let printTicketCalls: string[];
  let printTicketError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    loggingService = new TestApplicationLoggingService();
    printTicketCalls = [];
    printTicketError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        printing: {
          printTicket: (documentHtml: string): Promise<void> => {
            printTicketCalls.push(documentHtml);

            if (printTicketError !== null) {
              return Promise.reject(printTicketError);
            }

            return Promise.resolve();
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        ReservaTicketPrintService,
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

  it('imprime el comprobante persistido sin generar avisos', async (): Promise<void> => {
    const service: ReservaTicketPrintService = TestBed.inject(ReservaTicketPrintService);

    await service.print(createAppData(), createReserva());

    expect(printTicketCalls).toHaveLength(1);
    expect(printTicketCalls[0]).toContain('RESERVA');
    expect(printTicketCalls[0]).toContain('Reserva nº 15');
    expect(printTicketCalls[0]).toContain('Artículo de prueba');

    expect(loggingService.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo al imprimir el comprobante', async (): Promise<void> => {
    const error: Error = new Error('No hay una impresora de tickets configurada.');

    printTicketError = error;

    const service: ReservaTicketPrintService = TestBed.inject(ReservaTicketPrintService);

    await expect(service.print(createAppData(), createReserva())).rejects.toBe(error);

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'print-reservation-receipt',
        message: 'No se ha podido imprimir el comprobante de una reserva.',
        error,
        context: {
          reservaId: 15,
        },
      },
    ]);
  });
});

/**
 * Construye una configuración mínima válida para
 * generar el comprobante de una reserva.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-08-01T10:00:00.000Z',
    nombre: 'Empresa de prueba',
    nombreComercial: 'Comercio de prueba',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',
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
    ivaList: [21, 10, 4],
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

/**
 * Construye una reserva persistida reutilizable
 * para las pruebas de impresión.
 */
function createReserva(): ReservaInterface {
  return {
    id: 15,
    publicId: 'reserva-15',
    idCliente: 10,
    clientePublicId: 'cliente-10',
    clienteNombre: 'Cliente de prueba',
    totalMicros: 12_100_000,
    fecha: '2026-10-09T10:00:00.000Z',
    lineas: [
      {
        id: 100,
        publicId: 'linea-100',
        idArticulo: 20,
        articuloPublicId: 'articulo-20',
        localizador: 123,
        marca: 'Marca',
        nombre: 'Artículo de prueba',
        pucMicros: 5_000_000,
        pvpMicros: 12_100_000,
        ivaBps: 2_100,
        importeMicros: 12_100_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
      },
    ],
  };
}
