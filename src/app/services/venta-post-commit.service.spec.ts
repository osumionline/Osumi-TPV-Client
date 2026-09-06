import { TestBed } from '@angular/core/testing';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type CrearClienteFacturaDesdeVentaCommand from '@desktop-contracts/clientes/crear-cliente-factura-desde-venta-command.interface';
import ClientesService from '@services/clientes.service';
import ReservasService from '@services/reservas.service';
import VentaPostCommitService from '@services/venta-post-commit.service';
import VentaTicketBaiService from '@services/venta-ticket-bai.service';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';

describe('VentaPostCommitService', (): void => {
  let clientesService: FakeClientesService;
  let reservasService: FakeReservasService;
  let ticketBaiService: FakeVentaTicketBaiService;
  let documentService: FakeVentaTicketDocumentService;
  let executionOrder: string[];

  beforeEach((): void => {
    executionOrder = [];

    clientesService = new FakeClientesService(executionOrder);
    reservasService = new FakeReservasService();
    ticketBaiService = new FakeVentaTicketBaiService(executionOrder);
    documentService = new FakeVentaTicketDocumentService(executionOrder);

    TestBed.configureTestingModule({
      providers: [
        VentaPostCommitService,
        {
          provide: ClientesService,
          useValue: clientesService,
        },
        {
          provide: ReservasService,
          useValue: reservasService,
        },
        {
          provide: VentaTicketBaiService,
          useValue: ticketBaiService,
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

    const warnings: readonly string[] = await service.run(123, false, null, true);

    expect(warnings).toEqual([]);
    expect(ticketBaiService.processedVentaIds).toEqual([123]);
    expect(documentService.generatePdfVentaIds).toEqual([123]);
    expect(documentService.printVentaIds).toEqual([123]);
    expect(executionOrder).toEqual(['ticketbai', 'pdf', 'print']);
    expect(reservasService.reloadCalls).toBe(0);
  });

  it('continúa con PDF e impresión cuando falla TicketBAI', async (): Promise<void> => {
    ticketBaiService.error = new Error('TicketBAI no disponible.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, null, true);

    expect(warnings).toEqual([
      'No se ha podido completar TicketBAI. El ticket se imprimirá sin el código QR fiscal. TicketBAI no disponible.',
    ]);
    expect(ticketBaiService.processedVentaIds).toEqual([123]);
    expect(documentService.generatePdfVentaIds).toEqual([123]);
    expect(documentService.printVentaIds).toEqual([123]);
    expect(executionOrder).toEqual(['ticketbai', 'pdf', 'print']);
  });

  it('recarga las reservas cuando la venta procedía de ellas', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, true, null, true);

    expect(warnings).toEqual([]);
    expect(reservasService.reloadCalls).toBe(1);
  });

  it('continúa con la impresión aunque falle la generación del PDF', async (): Promise<void> => {
    documentService.generatePdfError = new Error('No se ha podido generar el PDF.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, null, true);

    expect(warnings).toEqual([
      'No se ha podido conservar el PDF histórico del ticket. No se ha podido generar el PDF.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });

  it('conserva el resultado del PDF aunque falle la impresión', async (): Promise<void> => {
    documentService.printError = new Error('No hay una impresora de tickets configurada.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, null, true);

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

    const warnings: readonly string[] = await service.run(123, false, null, true);

    expect(warnings).toEqual([
      'No se ha podido conservar el PDF histórico del ticket. Fallo PDF.',
      'No se ha podido imprimir el ticket. Fallo impresión.',
    ]);
  });

  it('recoge una incidencia al actualizar reservas sin impedir los documentos', async (): Promise<void> => {
    reservasService.errorValue = 'No se han podido cargar las reservas.';

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, true, null, true);

    expect(warnings).toEqual([
      'No se ha podido actualizar la lista de reservas. No se han podido cargar las reservas.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });

  it('invalida las estadísticas del cliente después del COMMIT', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, 'cliente-1', true);

    expect(warnings).toEqual([]);

    expect(clientesService.invalidatedPublicIds).toEqual(['cliente-1']);
  });

  it('no invalida estadísticas cuando la venta no tiene cliente', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    await service.run(123, false, null, true);

    expect(clientesService.invalidatedPublicIds).toEqual([]);
  });

  it('continúa con PDF e impresión aunque falle la invalidación de estadísticas', async (): Promise<void> => {
    clientesService.invalidateError = new Error('Fallo de caché.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, 'cliente-1', true);

    expect(warnings).toEqual([
      'No se han podido actualizar las estadísticas del cliente. Fallo de caché.',
    ]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);

    expect(documentService.printVentaIds).toEqual([123]);
  });

  it('conserva el PDF pero no imprime cuando el usuario elige no imprimir ticket', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(123, false, null, false);

    expect(warnings).toEqual([]);

    expect(documentService.generatePdfVentaIds).toEqual([123]);
    expect(documentService.printVentaIds).toEqual([]);
    expect(executionOrder).toEqual(['ticketbai', 'pdf']);
  });

  it('crea e imprime la factura después de imprimir el ticket', async (): Promise<void> => {
    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(
      123,
      false,
      'cliente-1',
      true,
      'venta-1',
      true,
    );

    expect(warnings).toEqual([]);

    expect(clientesService.createFacturaCommands).toEqual([
      {
        clientePublicId: 'cliente-1',
        ventaPublicId: 'venta-1',
      },
    ]);

    expect(clientesService.printFacturaConsultas).toEqual([
      {
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      },
    ]);

    expect(executionOrder).toEqual(['ticketbai', 'pdf', 'print', 'factura', 'factura-print']);
  });

  it('continúa creando e imprimiendo la factura aunque falle la impresión del ticket', async (): Promise<void> => {
    documentService.printError = new Error('Impresora térmica no disponible.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(
      123,
      false,
      'cliente-1',
      true,
      'venta-1',
      true,
    );

    expect(warnings).toEqual([
      'No se ha podido imprimir el ticket. Impresora térmica no disponible.',
    ]);

    expect(clientesService.createFacturaCommands).toHaveLength(1);

    expect(clientesService.printFacturaConsultas).toHaveLength(1);

    expect(executionOrder).toEqual(['ticketbai', 'pdf', 'print', 'factura', 'factura-print']);
  });

  it('informa del fallo de factura sin repetir ni invalidar la venta confirmada', async (): Promise<void> => {
    clientesService.createFacturaError = new Error('La venta ya no está disponible para facturar.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(
      123,
      false,
      'cliente-1',
      true,
      'venta-1',
      true,
    );

    expect(warnings).toEqual([
      'No se ha podido crear la factura de la venta. La venta ya no está disponible para facturar.',
    ]);

    expect(clientesService.printFacturaConsultas).toEqual([]);

    expect(executionOrder).toEqual(['ticketbai', 'pdf', 'print', 'factura']);
  });

  it('conserva la factura emitida aunque falle su diálogo de impresión', async (): Promise<void> => {
    clientesService.printFacturaError = new Error('No hay impresoras disponibles.');

    const service: VentaPostCommitService = TestBed.inject(VentaPostCommitService);

    const warnings: readonly string[] = await service.run(
      123,
      false,
      'cliente-1',
      true,
      'venta-1',
      true,
    );

    expect(warnings).toEqual([
      'La factura 21_2026 se ha creado correctamente, pero no se ha podido abrir el diálogo de impresión. No hay impresoras disponibles.',
    ]);

    expect(clientesService.createFacturaCommands).toHaveLength(1);

    expect(clientesService.printFacturaConsultas).toHaveLength(1);
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

class FakeVentaTicketBaiService {
  readonly processedVentaIds: number[] = [];
  error: Error | null = null;

  constructor(private readonly executionOrder: string[]) {}

  /**
   * Simula el procesamiento TicketBAI
   * posterior al COMMIT.
   */
  processInitial(idVenta: number): Promise<void> {
    this.processedVentaIds.push(idVenta);
    this.executionOrder.push('ticketbai');

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve();
  }
}

class FakeVentaTicketDocumentService {
  readonly generatePdfVentaIds: number[] = [];
  readonly printVentaIds: number[] = [];
  generatePdfError: Error | null = null;
  printError: Error | null = null;

  constructor(private readonly executionOrder: string[]) {}

  /**
   * Simula la generación y persistencia
   * del PDF documental de la venta.
   */
  generateAndSavePdf(idVenta: number): Promise<void> {
    this.generatePdfVentaIds.push(idVenta);
    this.executionOrder.push('pdf');

    if (this.generatePdfError !== null) {
      return Promise.reject(this.generatePdfError);
    }

    return Promise.resolve();
  }

  /**
   * Simula la impresión física
   * del ticket de venta.
   */
  print(idVenta: number): Promise<void> {
    this.printVentaIds.push(idVenta);
    this.executionOrder.push('print');

    if (this.printError !== null) {
      return Promise.reject(this.printError);
    }

    return Promise.resolve();
  }
}

class FakeClientesService {
  readonly invalidatedPublicIds: string[] = [];
  readonly createFacturaCommands: CrearClienteFacturaDesdeVentaCommand[] = [];
  readonly printFacturaConsultas: ClienteFacturaDocumentoConsulta[] = [];
  invalidateError: Error | null = null;
  createFacturaError: Error | null = null;
  printFacturaError: Error | null = null;

  constructor(private readonly executionOrder: string[]) {}

  /**
   * Simula la invalidación de estadísticas.
   */
  invalidateEstadisticas(publicId: string): Promise<void> {
    this.invalidatedPublicIds.push(publicId);

    if (this.invalidateError !== null) {
      return Promise.reject(this.invalidateError);
    }

    return Promise.resolve();
  }

  /**
   * Simula la creación atómica de la factura
   * emitida asociada a una venta.
   */
  createFacturaDesdeVenta(
    command: CrearClienteFacturaDesdeVentaCommand,
  ): Promise<ClienteFacturaInterface> {
    this.createFacturaCommands.push(command);
    this.executionOrder.push('factura');

    if (this.createFacturaError !== null) {
      return Promise.reject(this.createFacturaError);
    }

    return Promise.resolve(createFacturaEmitida());
  }

  /**
   * Simula el diálogo estándar de impresión
   * del PDF definitivo de una factura.
   */
  printFactura(consulta: ClienteFacturaDocumentoConsulta): Promise<void> {
    this.printFacturaConsultas.push(consulta);
    this.executionOrder.push('factura-print');

    if (this.printFacturaError !== null) {
      return Promise.reject(this.printFacturaError);
    }

    return Promise.resolve();
  }
}

/**
 * Crea la factura emitida utilizada por el
 * postproceso de venta simulado.
 */
function createFacturaEmitida(): ClienteFacturaInterface {
  return {
    publicId: 'factura-1',
    serie: '',
    numero: 21,
    year: 2026,
    numeroFactura: '21_2026',
    estado: 'emitida',
    fecha: '2026-09-06T21:00:00.000Z',
    fechaCreacion: '2026-09-06T21:00:00.000Z',
    fechaEmision: '2026-09-06T21:00:00.000Z',
    fechaAnulacion: null,
    importeCents: 1_000,
    capacidades: {
      puedeEditar: false,
      puedeEliminar: false,
      puedePrevisualizar: false,
      puedeFacturar: false,
      puedeImprimir: true,
      puedeEnviarEmail: true,
      puedeAnular: true,
    },
  };
}
