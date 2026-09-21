import { TestBed, type ComponentFixture } from '@angular/core/testing';
import HistoricalSalesComponent from '@modules/ventas/components/historical-sales/historical-sales.component';
import ClienteProteccionDatosPrintService from '@services/clientes/cliente-proteccion-datos-print.service';
import ClientesService from '@services/clientes/clientes.service';
import VentaTicketBaiService from '@services/ventas/venta-ticket-bai.service';
import VentaTicketDocumentService from '@services/ventas/venta-ticket-document.service';
import VentaTicketEmailService from '@services/ventas/venta-ticket-email.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import VentasHistoricoService from '@services/ventas/ventas-historico.service';
import VentasPostventaService from '@services/ventas/ventas-postventa.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('HistoricalSalesComponent', (): void => {
  let fixture: ComponentFixture<HistoricalSalesComponent>;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [HistoricalSalesComponent],
      providers: [
        {
          provide: VentasHistoricoService,
          useValue: {
            getHistorico: vi.fn().mockResolvedValue({
              ventas: [],
              resumen: {
                numeroVentas: 0,
                totalCents: 0,
                ticketMedioCents: 0,
                beneficioCents: 0,
                totalesPorTipoPago: [],
              },
            }),
            getDetalle: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: VentasPostventaService,
          useValue: {},
        },
        {
          provide: ClientesService,
          useValue: {
            clientes: (): readonly [] => [],
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VentasContextService,
          useValue: {
            tiposPago: (): readonly [] => [],
            appData: (): null => null,
          },
        },
        {
          provide: ClienteProteccionDatosPrintService,
          useValue: {
            print: vi.fn(),
          },
        },
        {
          provide: VentaTicketBaiService,
          useValue: {},
        },
        {
          provide: VentaTicketDocumentService,
          useValue: {},
        },
        {
          provide: VentaTicketEmailService,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalSalesComponent);
  });

  it('mantiene por defecto la presentación modal de Ventas', async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.overlay')).not.toBeNull();
    expect(element.querySelector('.historical-sales__header')).not.toBeNull();
    expect(element.querySelector('.historical-sales__tabs')).not.toBeNull();
    expect(element.textContent).toContain('Salidas caja');
  });

  it('elimina el envoltorio modal y las pestañas en modo embebido', async (): Promise<void> => {
    fixture.componentRef.setInput('embedded', true);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.overlay')).toBeNull();
    expect(element.querySelector('.historical-sales__header')).toBeNull();
    expect(element.querySelector('.historical-sales__tabs')).toBeNull();
    expect(element.querySelector('.historical-sales__filters')).not.toBeNull();
  });

  it('no emite cierre cuando está embebido', (): void => {
    const component: HistoricalSalesComponent = fixture.componentInstance;
    const closeSpy = vi.fn();

    component.closeEvent.subscribe(closeSpy);

    fixture.componentRef.setInput('embedded', true);

    component.close();

    expect(closeSpy).not.toHaveBeenCalled();
  });
});
