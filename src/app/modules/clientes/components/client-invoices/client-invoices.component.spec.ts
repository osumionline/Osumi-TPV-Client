import { signal, type WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteFacturasState from '@model/clientes/cliente-facturas-state.interface';
import ClientInvoicesComponent from '@modules/clientes/components/client-invoices/client-invoices.component';
import ClientesService from '@services/clientes.service';

describe('ClientInvoicesComponent', (): void => {
  let fixture: ComponentFixture<ClientInvoicesComponent>;
  let clientesService: FakeClientesService;

  beforeEach(async (): Promise<void> => {
    clientesService = new FakeClientesService();

    await TestBed.configureTestingModule({
      imports: [ClientInvoicesComponent],
      providers: [
        {
          provide: ClientesService,
          useValue: clientesService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientInvoicesComponent);
    fixture.componentRef.setInput('clientePublicId', 'cliente-1');
    fixture.componentRef.setInput('emailConfigured', true);
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('carga y muestra borradores, facturas emitidas y facturas anuladas', (): void => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(clientesService.requestedPublicIds).toEqual(['cliente-1']);
    expect(element.querySelectorAll('.client-invoices__row')).toHaveLength(3);
    expect(element.textContent).toContain('Borrador');
    expect(element.textContent).toContain('21_2026');
    expect(element.textContent).toContain('20_2026');
    expect(element.textContent).toContain('Emitida');
    expect(element.textContent).toContain('Anulada');
    expect(element.querySelectorAll('.client-invoices__email-button')).toHaveLength(1);
    expect(element.querySelectorAll('.client-invoices__print-button')).toHaveLength(1);
  });

  it('emite las acciones de su fila sin abrir accidentalmente la factura', (): void => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const opened: ClienteFacturaInterface[] = [];
    const emailed: ClienteFacturaInterface[] = [];
    const printed: ClienteFacturaInterface[] = [];
    const newRequests: boolean[] = [];

    fixture.componentInstance.openFacturaEvent.subscribe(
      (factura: ClienteFacturaInterface): void => {
        opened.push(factura);
      },
    );
    fixture.componentInstance.emailFacturaEvent.subscribe(
      (factura: ClienteFacturaInterface): void => {
        emailed.push(factura);
      },
    );
    fixture.componentInstance.printFacturaEvent.subscribe(
      (factura: ClienteFacturaInterface): void => {
        printed.push(factura);
      },
    );
    fixture.componentInstance.newFacturaEvent.subscribe((): void => {
      newRequests.push(true);
    });

    const rows: HTMLElement[] = Array.from(
      element.querySelectorAll<HTMLElement>('.client-invoices__row'),
    );

    rows.forEach((row: HTMLElement): void => {
      row.click();
    });

    expect(opened.map((factura: ClienteFacturaInterface): string => factura.publicId)).toEqual([
      'factura-borrador',
      'factura-emitida',
      'factura-anulada',
    ]);

    opened.length = 0;

    element.querySelector<HTMLButtonElement>('.client-invoices__email-button')?.click();
    element.querySelector<HTMLButtonElement>('.client-invoices__print-button')?.click();
    element.querySelector<HTMLButtonElement>('.client-invoices__new-button')?.click();

    expect(opened).toHaveLength(0);
    expect(emailed[0]?.publicId).toBe('factura-emitida');
    expect(printed[0]?.publicId).toBe('factura-emitida');
    expect(newRequests).toHaveLength(1);
  });

  it('permite abrir una factura mediante teclado', (): void => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const opened: ClienteFacturaInterface[] = [];

    fixture.componentInstance.openFacturaEvent.subscribe(
      (factura: ClienteFacturaInterface): void => {
        opened.push(factura);
      },
    );

    const row: HTMLElement | null = element.querySelector<HTMLElement>(
      '.client-invoices__row',
    );

    row?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      }),
    );

    expect(opened[0]?.publicId).toBe('factura-borrador');
  });

  it('muestra carga, error con reintento y listado vacío', (): void => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    clientesService.stateSignal.set({
      data: null,
      loading: true,
      error: null,
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('Cargando facturas del cliente...');

    clientesService.stateSignal.set({
      data: null,
      loading: false,
      error: 'Error simulado de facturas.',
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('Error simulado de facturas.');

    element
      .querySelector<HTMLButtonElement>('.client-invoices__state--error button')
      ?.click();

    expect(clientesService.reloadedPublicIds).toEqual(['cliente-1']);

    clientesService.stateSignal.set({
      data: [],
      loading: false,
      error: null,
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('El cliente todavía no tiene facturas.');
  });

  it('bloquea únicamente las acciones que no están disponibles', (): void => {
    fixture.componentRef.setInput('emailConfigured', false);
    fixture.componentRef.setInput('createDisabled', true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const emailButton: HTMLButtonElement | null =
      element.querySelector<HTMLButtonElement>('.client-invoices__email-button');
    const printButton: HTMLButtonElement | null =
      element.querySelector<HTMLButtonElement>('.client-invoices__print-button');
    const newButton: HTMLButtonElement | null =
      element.querySelector<HTMLButtonElement>('.client-invoices__new-button');

    expect(emailButton?.disabled).toBe(true);
    expect(printButton?.disabled).toBe(false);
    expect(newButton?.disabled).toBe(true);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(printButton?.disabled).toBe(true);
  });
});

class FakeClientesService {
  readonly stateSignal: WritableSignal<ClienteFacturasState> = signal<ClienteFacturasState>({
    data: createFacturas(),
    loading: false,
    error: null,
  });
  readonly requestedPublicIds: string[] = [];
  readonly reloadedPublicIds: string[] = [];

  /**
   * Devuelve el estado configurado para la prueba.
   */
  getFacturasState(): ClienteFacturasState {
    return this.stateSignal();
  }

  /**
   * Registra la carga lazy inicial.
   */
  loadFacturas(publicId: string): Promise<void> {
    this.requestedPublicIds.push(publicId);

    return Promise.resolve();
  }

  /**
   * Registra una recarga solicitada por el componente.
   */
  reloadFacturas(publicId: string): Promise<void> {
    this.reloadedPublicIds.push(publicId);

    return Promise.resolve();
  }
}

/**
 * Crea facturas representativas de los tres estados.
 */
function createFacturas(): readonly ClienteFacturaInterface[] {
  return [
    {
      publicId: 'factura-borrador',
      serie: '',
      numero: null,
      year: null,
      numeroFactura: null,
      estado: 'borrador',
      fecha: '2026-09-04T10:00:00.000Z',
      fechaCreacion: '2026-09-04T10:00:00.000Z',
      fechaEmision: null,
      fechaAnulacion: null,
      importeCents: 5_000,
      capacidades: {
        puedeEditar: true,
        puedeEliminar: true,
        puedePrevisualizar: true,
        puedeFacturar: true,
        puedeImprimir: false,
        puedeEnviarEmail: false,
        puedeAnular: false,
      },
    },
    {
      publicId: 'factura-emitida',
      serie: '',
      numero: 21,
      year: 2026,
      numeroFactura: '21_2026',
      estado: 'emitida',
      fecha: '2026-09-03T12:00:00.000Z',
      fechaCreacion: '2026-09-02T12:00:00.000Z',
      fechaEmision: '2026-09-03T12:00:00.000Z',
      fechaAnulacion: null,
      importeCents: 12_345,
      capacidades: {
        puedeEditar: false,
        puedeEliminar: false,
        puedePrevisualizar: false,
        puedeFacturar: false,
        puedeImprimir: true,
        puedeEnviarEmail: true,
        puedeAnular: true,
      },
    },
    {
      publicId: 'factura-anulada',
      serie: '',
      numero: 20,
      year: 2026,
      numeroFactura: '20_2026',
      estado: 'anulada',
      fecha: '2026-08-20T09:00:00.000Z',
      fechaCreacion: '2026-08-19T09:00:00.000Z',
      fechaEmision: '2026-08-20T09:00:00.000Z',
      fechaAnulacion: '2026-09-01T08:00:00.000Z',
      importeCents: 8_750,
      capacidades: {
        puedeEditar: false,
        puedeEliminar: false,
        puedePrevisualizar: false,
        puedeFacturar: false,
        puedeImprimir: false,
        puedeEnviarEmail: false,
        puedeAnular: false,
      },
    },
  ];
}