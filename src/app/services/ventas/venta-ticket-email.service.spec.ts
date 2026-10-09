import { TestBed } from '@angular/core/testing';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import VentaTicketDocumentService from '@services/ventas/venta-ticket-document.service';
import VentaTicketEmailService from '@services/ventas/venta-ticket-email.service';

describe('VentaTicketEmailService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let documentService: FakeVentaTicketDocumentService;
  let sentCommands: VentaTicketEmailCommand[];
  let sendError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');
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

  it('garantiza el PDF vigente antes de solicitar el envío', async (): Promise<void> => {
    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await service.send(123, 'cliente@example.com');

    expect(documentService.ensureVentaIds).toEqual([123]);

    expect(sentCommands).toEqual([
      {
        idVenta: 123,
        destinatario: 'cliente@example.com',
      },
    ]);
  });

  it('no intenta enviar si falla la preparación del PDF vigente', async (): Promise<void> => {
    documentService.ensureError = new Error('No se ha podido preparar el PDF.');

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await expect(service.send(123, 'cliente@example.com')).rejects.toThrow(
      'No se ha podido preparar el PDF.',
    );

    expect(sentCommands).toEqual([]);
  });

  it('propaga el error de envío del backend sin duplicar su logging', async (): Promise<void> => {
    sendError = new Error('No se ha podido enviar el email.');

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await expect(service.send(123, 'cliente@example.com')).rejects.toBe(sendError);

    expect(documentService.ensureVentaIds).toEqual([123]);
  });

  it('propaga el error de envío del backend', async (): Promise<void> => {
    sendError = new Error('No se ha podido enviar el email.');

    const service: VentaTicketEmailService = TestBed.inject(VentaTicketEmailService);

    await expect(service.send(123, 'cliente@example.com')).rejects.toThrow(
      'No se ha podido enviar el email.',
    );
  });
});

class FakeVentaTicketDocumentService {
  ensureError: Error | null = null;

  readonly ensureVentaIds: number[] = [];

  /**
   * Simula la garantía del PDF documental vigente.
   */
  ensureCurrentPdf(idVenta: number): Promise<void> {
    this.ensureVentaIds.push(idVenta);

    if (this.ensureError !== null) {
      return Promise.reject(this.ensureError);
    }

    return Promise.resolve();
  }
}
