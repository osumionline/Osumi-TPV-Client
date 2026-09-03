import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  VentaHistoricoConsulta,
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
});

class FakeVentasHistoricoService {
  readonly consultas: VentaHistoricoConsulta[] = [];

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
