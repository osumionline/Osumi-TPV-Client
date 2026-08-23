import { TestBed } from '@angular/core/testing';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';
import VentasContextService from '@services/ventas-context.service';
import VentasTicketsService from '@services/ventas-tickets.service';

describe('VentaTicketDocumentService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let contextService: FakeVentasContextService;
  let ticketsService: FakeVentasTicketsService;

  let renderPdfCalls: string[];
  let printTicketCalls: string[];

  let renderedPdf: Uint8Array;

  let renderPdfError: Error | null;
  let printTicketError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    contextService = new FakeVentasContextService();

    ticketsService = new FakeVentasTicketsService();

    renderPdfCalls = [];
    printTicketCalls = [];

    renderedPdf = new TextEncoder().encode('%PDF-1.7\nticket definitivo\n%%EOF');

    renderPdfError = null;
    printTicketError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        printing: {
          renderPdf: (documentHtml: string): Promise<Uint8Array> => {
            renderPdfCalls.push(documentHtml);

            if (renderPdfError !== null) {
              return Promise.reject(renderPdfError);
            }

            return Promise.resolve(renderedPdf);
          },

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
        VentaTicketDocumentService,
        {
          provide: VentasContextService,
          useValue: contextService,
        },
        {
          provide: VentasTicketsService,
          useValue: ticketsService,
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

  it('construye el HTML desde el snapshot persistido', async (): Promise<void> => {
    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    const documentHtml: string = await service.buildHtml(123);

    expect(ticketsService.requestedVentaIds).toEqual([123]);

    expect(documentHtml).toContain('F. simplificada A-456');

    expect(documentHtml).toContain('data-qr-content="-123"');

    expect(documentHtml).toContain('Artículo de prueba');
  });

  it('genera el PDF y conserva exactamente el resultado devuelto por printing', async (): Promise<void> => {
    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await service.generateAndSavePdf(123);

    expect(renderPdfCalls).toHaveLength(1);

    expect(renderPdfCalls[0]).toContain('data-qr-content="-123"');

    expect(ticketsService.savedPdfs).toHaveLength(1);

    expect(ticketsService.savedPdfs[0]?.idVenta).toBe(123);

    expect(ticketsService.savedPdfs[0]?.pdf).toBe(renderedPdf);
  });

  it('no intenta guardar el PDF si falla el renderer', async (): Promise<void> => {
    renderPdfError = new Error('No se ha podido generar el PDF.');

    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await expect(service.generateAndSavePdf(123)).rejects.toThrow(
      'No se ha podido generar el PDF.',
    );

    expect(ticketsService.savedPdfs).toEqual([]);
  });

  it('propaga un error al guardar el PDF histórico', async (): Promise<void> => {
    ticketsService.savePdfError = new Error('No se ha podido conservar el PDF.');

    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await expect(service.generateAndSavePdf(123)).rejects.toThrow(
      'No se ha podido conservar el PDF.',
    );

    expect(renderPdfCalls).toHaveLength(1);
  });

  it('imprime exactamente el HTML construido desde la venta persistida', async (): Promise<void> => {
    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await service.print(123);

    expect(printTicketCalls).toHaveLength(1);

    expect(printTicketCalls[0]).toContain('F. simplificada A-456');

    expect(printTicketCalls[0]).toContain('data-qr-content="-123"');

    expect(renderPdfCalls).toEqual([]);
    expect(ticketsService.savedPdfs).toEqual([]);
  });

  it('propaga los errores de impresión para que el orquestador pueda tratarlos', async (): Promise<void> => {
    printTicketError = new Error('No hay una impresora de tickets configurada.');

    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await expect(service.print(123)).rejects.toThrow(
      'No hay una impresora de tickets configurada.',
    );
  });

  it('no inicia ningún postproceso si la venta ya no puede recuperarse', async (): Promise<void> => {
    ticketsService.ticket = null;

    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await expect(service.generateAndSavePdf(123)).rejects.toThrow(
      'No se ha podido recuperar la venta para generar su ticket.',
    );

    expect(renderPdfCalls).toEqual([]);
    expect(ticketsService.savedPdfs).toEqual([]);
  });

  it('rechaza generar el documento si no están disponibles los datos del negocio', async (): Promise<void> => {
    contextService.appDataValue = null;

    const service: VentaTicketDocumentService = TestBed.inject(VentaTicketDocumentService);

    await expect(service.buildHtml(123)).rejects.toThrow(
      'No se han podido obtener los datos del negocio para generar el ticket.',
    );
  });
});

class FakeVentasContextService {
  appDataValue: AppData | null = createAppData();

  readonly appData = (): AppData | null => this.appDataValue;
}

interface SavedPdf {
  readonly idVenta: number;
  readonly pdf: Uint8Array;
}

class FakeVentasTicketsService {
  ticket: VentaTicketInterface | null = createTicket();

  savePdfError: Error | null = null;

  readonly requestedVentaIds: number[] = [];
  readonly savedPdfs: SavedPdf[] = [];

  getByVentaId(idVenta: number): Promise<VentaTicketInterface | null> {
    this.requestedVentaIds.push(idVenta);

    return Promise.resolve(this.ticket);
  }

  savePdf(idVenta: number, pdf: Uint8Array): Promise<void> {
    if (this.savePdfError !== null) {
      return Promise.reject(this.savePdfError);
    }

    this.savedPdfs.push({
      idVenta,
      pdf,
    });

    return Promise.resolve();
  }
}

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
    tipoIva: 'iva',
    ivaList: [21, 10, 4],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    fechaCad: false,
    empleados: false,
  };
}

function createTicket(): VentaTicketInterface {
  return {
    id: 123,
    publicId: 'venta-public-id',
    serie: 'A',
    numero: 456,
    fecha: '2026-08-21T18:00:00.000Z',
    empleadoNombre: 'Empleado de prueba',
    clienteNombre: 'Cliente de prueba',
    totalCents: 1_210,
    pagos: [
      {
        nombre: 'Efectivo',
        importeCents: 1_210,
        entregadoCents: 2_000,
        cambioCents: 790,
      },
    ],
    lineas: [
      {
        nombre: 'Artículo de prueba',
        pvpMicros: 12_100_000,
        ivaBps: 2_100,
        importeMicros: 12_100_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
      },
    ],
  };
}
