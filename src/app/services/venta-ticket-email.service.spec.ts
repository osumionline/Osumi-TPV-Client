import { TestBed } from '@angular/core/testing';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';
import VentaTicketEmailService from '@services/venta-ticket-email.service';
import VentasTicketsService from '@services/ventas-tickets.service';

describe('VentaTicketEmailService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let ticketsService: FakeVentasTicketsService;

  let documentService: FakeVentaTicketDocumentService;

  let sentCommands: VentaTicketEmailCommand[];

  let sendError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    ticketsService = new FakeVentasTicketsService();

    documentService = new FakeVentaTicketDocumentService();

    sentCommands = [];
    sendError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        ventas: {
          sendTicketEmail: (command: VentaTicketEmailCommand): Promise<void> => {
            sentCommands.push(command);

            if (sendError !== null) {
              return Promise.reject(sendError);
            }

            return Promise.resolve();
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        VentaTicketEmailService,

        {
          provide: VentasTicketsService,
          useValue: ticketsService,
        },

        {
          provide: VentaTicketDocumentService,
          useValue: documentService,
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

  it('envía directamente cuando ya existe PDF vigente', async (): Promise<void> => {
    ticketsService.currentPdf = createPdf();

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await service.send(123, 'cliente@example.com');

    expect(ticketsService.requestedVentaIds).toEqual([123]);

    expect(documentService.generatedVentaIds).toEqual([]);

    expect(sentCommands).toEqual([
      {
        idVenta: 123,
        destinatario: 'cliente@example.com',
      },
    ]);
  });

  it('materializa el PDF antes de enviar cuando no existe uno vigente', async (): Promise<void> => {
    ticketsService.currentPdf = null;

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await service.send(123, 'cliente@example.com');

    expect(documentService.generatedVentaIds).toEqual([123]);

    expect(sentCommands).toEqual([
      {
        idVenta: 123,
        destinatario: 'cliente@example.com',
      },
    ]);
  });

  it('no intenta enviar si falla la materialización del PDF', async (): Promise<void> => {
    ticketsService.currentPdf = null;

    documentService.generateError = new Error('No se ha podido generar el PDF.');

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await expect(service.send(123, 'cliente@example.com')).rejects.toThrow(
      'No se ha podido generar el PDF.',
    );

    expect(sentCommands).toEqual([]);
  });

  it('propaga el error de envío del backend', async (): Promise<void> => {
    ticketsService.currentPdf = createPdf();

    sendError = new Error('No se ha podido enviar el email.');

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await expect(service.send(123, 'cliente@example.com')).rejects.toThrow(
      'No se ha podido enviar el email.',
    );
  });
});

class FakeVentasTicketsService {
  currentPdf: Uint8Array | null = createPdf();

  readonly requestedVentaIds: number[] = [];

  /**
   * Devuelve el PDF vigente simulado.
   */
  getCurrentPdf(idVenta: number): Promise<Uint8Array | null> {
    this.requestedVentaIds.push(idVenta);

    return Promise.resolve(this.currentPdf);
  }
}

class FakeVentaTicketDocumentService {
  generateError: Error | null = null;

  readonly generatedVentaIds: number[] = [];

  /**
   * Simula la materialización del PDF vigente.
   */
  generateAndSavePdf(idVenta: number): Promise<void> {
    this.generatedVentaIds.push(idVenta);

    if (this.generateError !== null) {
      return Promise.reject(this.generateError);
    }

    return Promise.resolve();
  }
}

/**
 * Construye un PDF mínimo válido para el test.
 */
function createPdf(): Uint8Array {
  return new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');
}
