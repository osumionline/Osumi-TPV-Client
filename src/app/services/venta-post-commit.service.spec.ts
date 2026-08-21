import { TestBed } from '@angular/core/testing';
import ReservasService from '@services/reservas.service';
import VentaPostCommitService from '@services/venta-post-commit.service';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';

describe('VentaPostCommitService', (): void => {
  let reservasService: FakeReservasService;
  let documentService: FakeVentaTicketDocumentService;

  beforeEach((): void => {
    reservasService = new FakeReservasService();
    documentService = new FakeVentaTicketDocumentService();

    TestBed.configureTestingModule({
      providers: [
        VentaPostCommitService,
        {
          provide: ReservasService,
          useValue: reservasService,
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
  });

  it('ejecuta PDF e impresión después del COMMIT', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false);

    expect(warnings).toEqual([]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);

    expect(reservasService.reloadCalls).toBe(0);
  });

  it('recarga las reservas cuando la venta procedía de ellas', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, true);

    expect(warnings).toEqual([]);
    expect(reservasService.reloadCalls).toBe(1);
  });

  it('continúa con la impresión aunque falle la generación del PDF', async (): Promise<void> => {
    documentService.generatePdfError = new Error('No se ha podido generar el PDF.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false);

    expect(warnings).toEqual([
      'No se ha podido conservar el PDF histórico del ticket. No se ha podido generar el PDF.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });

  it('conserva el resultado del PDF aunque falle la impresión', async (): Promise<void> => {
    documentService.printError = new Error('No hay una impresora de tickets configurada.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false);

    expect(warnings).toEqual([
      'No se ha podido imprimir el ticket. No hay una impresora de tickets configurada.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });

  it('recoge conjuntamente las incidencias de PDF e impresión', async (): Promise<void> => {
    documentService.generatePdfError = new Error('Fallo PDF.');

    documentService.printError = new Error('Fallo impresión.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false);

    expect(warnings).toEqual([
      'No se ha podido conservar el PDF histórico del ticket. Fallo PDF.',
      'No se ha podido imprimir el ticket. Fallo impresión.',
    ]);
  });

  it('recoge una incidencia al actualizar reservas sin impedir los documentos', async (): Promise<void> => {
    reservasService.errorValue = 'No se han podido cargar las reservas.';

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, true);

    expect(warnings).toEqual([
      'No se ha podido actualizar la lista de reservas. No se han podido cargar las reservas.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });
});

class FakeReservasService {
  reloadCalls: number = 0;

  errorValue: string | null = null;

  readonly error = (): string | null => this.errorValue;

  reload(): Promise<void> {
    this.reloadCalls++;

    return Promise.resolve();
  }
}

class FakeVentaTicketDocumentService {
  readonly generatePdfVentaIds: number[] = [];
  readonly printVentaIds: number[] = [];

  generatePdfError: Error | null = null;
  printError: Error | null = null;

  generateAndSavePdf(idVenta: number): Promise<void> {
    this.generatePdfVentaIds.push(idVenta);

    if (this.generatePdfError !== null) {
      return Promise.reject(this.generatePdfError);
    }

    return Promise.resolve();
  }

  print(idVenta: number): Promise<void> {
    this.printVentaIds.push(idVenta);

    if (this.printError !== null) {
      return Promise.reject(this.printError);
    }

    return Promise.resolve();
  }
}
