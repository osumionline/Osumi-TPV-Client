import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import ClientSalesComponent from '@modules/clientes/components/client-sales/client-sales.component';
import VentasHistoricoService from '@services/ventas-historico.service';

describe('ClientSalesComponent', (): void => {
  let fixture: ComponentFixture<ClientSalesComponent>;
  let ventasHistoricoService: FakeVentasHistoricoService;

  beforeEach(async (): Promise<void> => {
    ventasHistoricoService = new FakeVentasHistoricoService();

    await TestBed.configureTestingModule({
      imports: [ClientSalesComponent],
      providers: [
        {
          provide: VentasHistoricoService,
          useValue: ventasHistoricoService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientSalesComponent);
    fixture.componentRef.setInput('clientePublicId', 'cliente-1');
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('carga inicialmente el mes actual filtrado por cliente', (): void => {
    expect(ventasHistoricoService.consultas).toHaveLength(1);

    const consulta: VentaHistoricoConsulta | undefined = ventasHistoricoService.consultas[0];

    expect(consulta).toBeDefined();

    if (consulta === undefined) {
      return;
    }

    expect(consulta.clientePublicId).toBe('cliente-1');
    expect(consulta.desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(consulta.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(consulta.desde <= consulta.hasta).toBe(true);

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('A-17');
    expect(element.textContent).toContain('Tarjeta');
    expect(element.querySelector('.client-sales__negative-amount')).not.toBeNull();
    expect(element.textContent).not.toContain('TicketBAI');
  });

  it('consulta el rango explícito seleccionado por el usuario', async (): Promise<void> => {
    const component: ClientSalesComponent = fixture.componentInstance;

    component.onDesdeChange(createInputEvent('2026-01-01'));
    component.onHastaChange(createInputEvent('2026-03-31'));

    await component.search();

    expect(ventasHistoricoService.consultas).toHaveLength(2);
    expect(ventasHistoricoService.consultas[1]).toEqual({
      desde: '2026-01-01',
      hasta: '2026-03-31',
      clientePublicId: 'cliente-1',
    });
  });

  it('no consulta un rango temporal invertido', async (): Promise<void> => {
    const component: ClientSalesComponent = fixture.componentInstance;

    component.onDesdeChange(createInputEvent('2026-04-01'));
    component.onHastaChange(createInputEvent('2026-03-31'));

    expect(component.invalidRange()).toBe(true);
    expect(component.canSearch()).toBe(false);

    await component.search();

    expect(ventasHistoricoService.consultas).toHaveLength(1);
  });

  it('selecciona una venta y muestra su detalle en modo documental', async (): Promise<void> => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const row: HTMLTableRowElement | null =
      element.querySelector<HTMLTableRowElement>('.client-sales__row');

    expect(row).not.toBeNull();

    if (row === null) {
      return;
    }

    row.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(ventasHistoricoService.detalleConsultas).toEqual([17]);
    expect(element.querySelector('.client-sales__row--selected')).not.toBeNull();

    expect(element.textContent).toContain('Artículo del detalle');
    expect(element.textContent).toContain('Empleado detalle');

    expect(element.textContent).not.toContain('TicketBAI');
    expect(element.textContent).not.toContain('Acciones postventa');
    expect(element.textContent).not.toContain('Cambiar cliente');
    expect(element.textContent).not.toContain('Reimprimir ticket');
  });
});

class FakeVentasHistoricoService {
  readonly consultas: VentaHistoricoConsulta[] = [];
  readonly detalleConsultas: number[] = [];

  /**
   * Registra la consulta y devuelve una venta histórica preparada.
   */
  getHistorico(consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado> {
    this.consultas.push({
      ...consulta,
    });

    return Promise.resolve({
      ventas: [
        {
          id: 17,
          publicId: 'venta-17',
          serie: 'A-',
          numero: 17,
          fecha: '2026-08-25T10:30:00.000Z',
          totalCents: -1_234,
          clienteNombre: 'Cliente test',
          pagos: [
            {
              tipoPagoPublicId: 'tipo-pago-tarjeta',
              nombre: 'Tarjeta',
              importeCents: -1_234,
            },
          ],
          ticketBaiEstado: 'incidencia',
          tieneIncidenciaTicketBai: true,
        },
      ],
      resumen: {
        numeroVentas: 1,
        totalCents: -1_234,
        ticketMedioCents: -1_234,
        beneficioCents: -500,
        totalesPorTipoPago: [
          {
            tipoPagoPublicId: 'tipo-pago-tarjeta',
            nombre: 'Tarjeta',
            importeCents: -1_234,
          },
        ],
      },
    });
  }

  /**
   * Registra la venta solicitada y devuelve su detalle histórico.
   */
  getDetalle(idVenta: number): Promise<VentaHistoricoDetalle | null> {
    this.detalleConsultas.push(idVenta);

    return Promise.resolve({
      id: idVenta,
      publicId: `venta-${idVenta}`,
      serie: 'A-',
      numero: idVenta,
      fecha: '2026-08-25T10:30:00.000Z',
      empleadoNombre: 'Empleado detalle',
      cliente: {
        publicId: 'cliente-1',
        nombre: 'Cliente test',
        email: 'cliente@example.com',
      },
      totalCents: -1_234,
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          nombre: 'Tarjeta',
          importeCents: -1_234,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
      lineas: [
        {
          id: 100,
          localizador: 123,
          marca: 'Marca detalle',
          descripcion: 'Artículo del detalle',
          unidades: -1,
          pvpMicros: 12_340_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          importeMicros: -12_340_000,
          regalo: false,
        },
      ],
      totalUnidades: -1,
      totalDescuentoMicros: 0,
      ticketBaiEstado: 'incidencia',
      ticketBaiUltimoError: 'Incidencia de prueba',
      capacidades: {
        puedeCambiarCliente: true,
        puedeCambiarTipoPago: true,
        puedeImprimirTicketRegalo: true,
        puedeProcesarTicketBai: true,
        puedeComprobarTicketBai: true,
        puedeReintentarTicketBai: true,
      },
    });
  }
}

/**
 * Crea el evento mínimo necesario para simular un input de fecha.
 */
function createInputEvent(value: string): Event {
  return {
    target: {
      value,
    },
  } as unknown as Event;
}
