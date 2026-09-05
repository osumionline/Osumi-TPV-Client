import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
  ClienteFacturaVentasConsulta,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import ClientInvoiceEditorComponent from '@modules/clientes/components/client-invoice-editor/client-invoice-editor.component';
import { DialogService } from '@osumi/angular-tools';
import ClientesService from '@services/clientes.service';
import VentasHistoricoService from '@services/ventas-historico.service';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

class FakeClientesService {
  ventasDisponibles: readonly ClienteFacturaVentaDisponibleInterface[] = createVentasDisponibles();
  ventasFactura: readonly ClienteFacturaVentaInterface[] = createVentasFactura();

  receivedVentasDisponiblesConsulta: ClienteFacturaVentasDisponiblesConsulta | null = null;
  receivedVentasConsulta: ClienteFacturaVentasConsulta | null = null;
  receivedCreateCommand: CrearClienteFacturaBorradorCommand | null = null;
  receivedUpdateCommand: ActualizarClienteFacturaBorradorCommand | null = null;
  receivedDeleteCommand: EliminarClienteFacturaBorradorCommand | null = null;

  /**
   * Devuelve las ventas disponibles preparadas para la prueba.
   */
  getFacturaVentasDisponibles(
    consulta: ClienteFacturaVentasDisponiblesConsulta,
  ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> {
    this.receivedVentasDisponiblesConsulta = consulta;

    return Promise.resolve(this.ventasDisponibles);
  }

  /**
   * Devuelve las ventas históricas preparadas para la prueba.
   */
  getFacturaVentas(
    consulta: ClienteFacturaVentasConsulta,
  ): Promise<readonly ClienteFacturaVentaInterface[]> {
    this.receivedVentasConsulta = consulta;

    return Promise.resolve(this.ventasFactura);
  }

  /**
   * Simula la creación de un borrador persistido.
   */
  createFacturaBorrador(
    command: CrearClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    this.receivedCreateCommand = command;

    return Promise.resolve(createFacturaBorrador());
  }

  /**
   * Simula la actualización de un borrador persistido.
   */
  updateFacturaBorrador(
    command: ActualizarClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    this.receivedUpdateCommand = command;

    return Promise.resolve(
      createFacturaBorrador(
        command.borradorPublicId,
        command.ventasPublicIds.length === 2 ? 3_000 : 1_000,
      ),
    );
  }

  /**
   * Simula la eliminación de un borrador persistido.
   */
  deleteFacturaBorrador(command: EliminarClienteFacturaBorradorCommand): Promise<void> {
    this.receivedDeleteCommand = command;

    return Promise.resolve();
  }
}

class FakeVentasHistoricoService {
  requestedVentaId: number | null = null;

  /**
   * Registra la venta solicitada sin necesitar un
   * detalle completo para estas pruebas.
   */
  getDetalle(idVenta: number): Promise<null> {
    this.requestedVentaId = idVenta;

    return Promise.resolve(null);
  }
}

class FakeDialogService {
  result: boolean = true;
  confirmCount: number = 0;

  /**
   * Registra cada confirmación y devuelve el
   * resultado configurado para la prueba.
   */
  confirm(): Observable<boolean> {
    this.confirmCount++;

    return of(this.result);
  }
}

describe('ClientInvoiceEditorComponent', (): void => {
  let fixture: ComponentFixture<ClientInvoiceEditorComponent>;
  let clientesService: FakeClientesService;
  let ventasHistoricoService: FakeVentasHistoricoService;
  let dialogService: FakeDialogService;

  beforeEach(async (): Promise<void> => {
    clientesService = new FakeClientesService();
    ventasHistoricoService = new FakeVentasHistoricoService();
    dialogService = new FakeDialogService();

    await TestBed.configureTestingModule({
      imports: [ClientInvoiceEditorComponent],
      providers: [
        {
          provide: ClientesService,
          useValue: clientesService,
        },
        {
          provide: VentasHistoricoService,
          useValue: ventasHistoricoService,
        },
        {
          provide: DialogService,
          useValue: dialogService,
        },
      ],
    }).compileComponents();
  });

  it('abre una factura nueva con las ventas disponibles sin seleccionar', async (): Promise<void> => {
    await createFixture(null);

    expect(clientesService.receivedVentasDisponiblesConsulta).toEqual({
      clientePublicId: 'cliente-1',
      borradorPublicId: null,
    });
    expect(fixture.componentInstance.title()).toBe('Nueva factura');
    expect(fixture.componentInstance.editable()).toBe(true);
    expect(fixture.componentInstance.selectedVentasCount()).toBe(0);
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('crea el borrador usando únicamente las ventas seleccionadas', async (): Promise<void> => {
    await createFixture(null);

    fixture.componentInstance.toggleVenta('venta-1');

    expect(fixture.componentInstance.hasChanges()).toBe(true);
    expect(fixture.componentInstance.canSave()).toBe(true);

    await fixture.componentInstance.save();

    expect(clientesService.receivedCreateCommand).toEqual({
      clientePublicId: 'cliente-1',
      ventasPublicIds: ['venta-1'],
    });
    expect(fixture.componentInstance.currentFactura()?.estado).toBe('borrador');
    expect(fixture.componentInstance.title()).toBe('Borrador de factura');
    expect(fixture.componentInstance.hasChanges()).toBe(false);
  });

  it('abre un borrador con sus ventas actuales seleccionadas y permite actualizarlo', async (): Promise<void> => {
    clientesService.ventasDisponibles = [
      createVentaDisponible('venta-1', 41, 1_000, true),
      createVentaDisponible('venta-2', 42, 2_000, false),
    ];

    await createFixture(createFacturaBorrador());

    expect(clientesService.receivedVentasDisponiblesConsulta).toEqual({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
    });
    expect(fixture.componentInstance.selectedVentasCount()).toBe(1);
    expect(fixture.componentInstance.hasChanges()).toBe(false);

    fixture.componentInstance.toggleVenta('venta-2');

    await fixture.componentInstance.save();

    expect(clientesService.receivedUpdateCommand).toEqual({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
      ventasPublicIds: ['venta-1', 'venta-2'],
    });
    expect(fixture.componentInstance.selectedTotalCents()).toBe(3_000);
    expect(fixture.componentInstance.hasChanges()).toBe(false);
  });

  it('consulta una factura emitida sin ofrecer edición', async (): Promise<void> => {
    await createFixture(createFacturaEmitida());

    expect(clientesService.receivedVentasConsulta).toEqual({
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-emitida',
    });
    expect(clientesService.receivedVentasDisponiblesConsulta).toBeNull();
    expect(fixture.componentInstance.title()).toBe('Factura 21_2026');
    expect(fixture.componentInstance.editable()).toBe(false);
    expect(fixture.componentInstance.canSave()).toBe(false);
    expect(fixture.componentInstance.selectedVentasCount()).toBe(1);
  });

  it('reutiliza el detalle histórico al seleccionar una venta', async (): Promise<void> => {
    await createFixture(createFacturaEmitida());

    fixture.componentInstance.selectVenta(41);

    await Promise.resolve();
    await Promise.resolve();

    expect(ventasHistoricoService.requestedVentaId).toBe(41);
    expect(fixture.componentInstance.selectedVentaId()).toBe(41);
    expect(fixture.componentInstance.detalleError()).toBe(
      'La venta seleccionada ya no se encuentra disponible.',
    );
  });

  it('cierra directamente el editor cuando no existen cambios', async (): Promise<void> => {
    await createFixture(null);

    const closeRequests: boolean[] = [];

    fixture.componentInstance.closeEvent.subscribe((): void => {
      closeRequests.push(true);
    });

    fixture.componentInstance.requestClose();

    expect(dialogService.confirmCount).toBe(0);
    expect(closeRequests).toEqual([true]);
  });

  it('mantiene abierto el editor cuando se cancela el descarte de cambios', async (): Promise<void> => {
    await createFixture(null);

    const closeRequests: boolean[] = [];

    fixture.componentInstance.closeEvent.subscribe((): void => {
      closeRequests.push(true);
    });

    fixture.componentInstance.toggleVenta('venta-1');

    expect(fixture.componentInstance.hasChanges()).toBe(true);

    dialogService.result = false;

    fixture.componentInstance.requestClose();

    expect(dialogService.confirmCount).toBe(1);
    expect(closeRequests).toEqual([]);
    expect(fixture.componentInstance.hasChanges()).toBe(true);
    expect(fixture.componentInstance.blocked()).toBe(false);
  });

  it('cierra el editor cuando se confirma el descarte de cambios', async (): Promise<void> => {
    await createFixture(createFacturaBorrador());

    const closeRequests: boolean[] = [];

    fixture.componentInstance.closeEvent.subscribe((): void => {
      closeRequests.push(true);
    });

    fixture.componentInstance.toggleVenta('venta-2');

    expect(fixture.componentInstance.hasChanges()).toBe(true);

    dialogService.result = true;

    fixture.componentInstance.requestClose();

    expect(dialogService.confirmCount).toBe(1);
    expect(closeRequests).toEqual([true]);
  });

  it('elimina un borrador confirmado y cierra el modal', async (): Promise<void> => {
    await createFixture(createFacturaBorrador());

    const closeRequests: boolean[] = [];

    fixture.componentInstance.closeEvent.subscribe((): void => {
      closeRequests.push(true);
    });

    fixture.componentInstance.deleteBorrador();

    await Promise.resolve();
    await Promise.resolve();

    expect(clientesService.receivedDeleteCommand).toEqual({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
    });
    expect(closeRequests).toEqual([true]);
  });

  /**
   * Crea el componente con la factura indicada y espera
   * a que termine su carga inicial.
   */
  async function createFixture(factura: ClienteFacturaInterface | null): Promise<void> {
    fixture = TestBed.createComponent(ClientInvoiceEditorComponent);
    fixture.componentRef.setInput('clientePublicId', 'cliente-1');
    fixture.componentRef.setInput('factura', factura);
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();
  }
});

/**
 * Crea las ventas disponibles iniciales.
 */
function createVentasDisponibles(): readonly ClienteFacturaVentaDisponibleInterface[] {
  return [
    createVentaDisponible('venta-1', 41, 1_000, false),
    createVentaDisponible('venta-2', 42, 2_000, false),
  ];
}

/**
 * Crea una venta disponible para las pruebas del editor.
 */
function createVentaDisponible(
  publicId: string,
  id: number,
  totalCents: number,
  incluidaEnBorrador: boolean,
): ClienteFacturaVentaDisponibleInterface {
  return {
    id,
    publicId,
    serie: '',
    numero: id + 100,
    fecha: '2026-09-05T10:00:00.000Z',
    totalCents,
    incluidaEnBorrador,
    pagos: [
      {
        tipoPagoPublicId: 'efectivo',
        nombre: 'Efectivo',
        importeCents: totalCents,
      },
    ],
  };
}

/**
 * Crea las ventas históricas de una factura finalizada.
 */
function createVentasFactura(): readonly ClienteFacturaVentaInterface[] {
  return [
    {
      id: 41,
      publicId: 'venta-1',
      serie: '',
      numero: 141,
      fecha: '2026-09-05T10:00:00.000Z',
      totalCents: 1_000,
      pagos: [
        {
          tipoPagoPublicId: 'efectivo',
          nombre: 'Efectivo',
          importeCents: 1_000,
        },
      ],
    },
  ];
}

/**
 * Crea un borrador persistido para las pruebas.
 */
function createFacturaBorrador(
  publicId: string = 'factura-borrador',
  importeCents: number = 1_000,
): ClienteFacturaInterface {
  return {
    publicId,
    serie: '',
    numero: null,
    year: null,
    numeroFactura: null,
    estado: 'borrador',
    fecha: '2026-09-05T10:00:00.000Z',
    fechaCreacion: '2026-09-05T10:00:00.000Z',
    fechaEmision: null,
    fechaAnulacion: null,
    importeCents,
    capacidades: {
      puedeEditar: true,
      puedeEliminar: true,
      puedePrevisualizar: true,
      puedeFacturar: true,
      puedeImprimir: false,
      puedeEnviarEmail: false,
      puedeAnular: false,
    },
  };
}

/**
 * Crea una factura emitida para las pruebas.
 */
function createFacturaEmitida(): ClienteFacturaInterface {
  return {
    publicId: 'factura-emitida',
    serie: '',
    numero: 21,
    year: 2026,
    numeroFactura: '21_2026',
    estado: 'emitida',
    fecha: '2026-09-05T10:00:00.000Z',
    fechaCreacion: '2026-09-04T10:00:00.000Z',
    fechaEmision: '2026-09-05T10:00:00.000Z',
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
