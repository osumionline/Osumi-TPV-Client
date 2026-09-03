import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import HistoricalSaleDetailComponent from '@modules/ventas/components/historical-sale-detail/historical-sale-detail.component';

describe('HistoricalSaleDetailComponent', (): void => {
  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [HistoricalSaleDetailComponent],
    }).compileComponents();
  });

  it('mantiene por defecto la información y acciones postventa', (): void => {
    const fixture: ComponentFixture<HistoricalSaleDetailComponent> = TestBed.createComponent(
      HistoricalSaleDetailComponent,
    );

    fixture.componentRef.setInput('detalle', createDetalle());
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Incidencia TicketBAI');
    expect(element.textContent).toContain('Acciones postventa');
    expect(element.textContent).toContain('Cambiar cliente');
    expect(element.textContent).toContain('Reimprimir ticket');
  });

  it('oculta TicketBAI y todas las acciones en modo readonly', (): void => {
    const fixture: ComponentFixture<HistoricalSaleDetailComponent> = TestBed.createComponent(
      HistoricalSaleDetailComponent,
    );

    fixture.componentRef.setInput('detalle', createDetalle());
    fixture.componentRef.setInput('mode', 'readonly');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Artículo del detalle');
    expect(element.textContent).toContain('Empleado detalle');
    expect(element.textContent).toContain('Tarjeta');

    expect(element.textContent).not.toContain('TicketBAI');
    expect(element.textContent).not.toContain('Acciones postventa');
    expect(element.textContent).not.toContain('Cambiar cliente');
    expect(element.textContent).not.toContain('Cambiar tipo de pago');
    expect(element.textContent).not.toContain('Reimprimir ticket');
    expect(element.textContent).not.toContain('Ticket regalo');
    expect(element.textContent).not.toContain('Enviar por email');
  });
});

/**
 * Crea un detalle con todas las capacidades activas para comprobar
 * que el modo readonly las oculta independientemente del backend.
 */
function createDetalle(): VentaHistoricoDetalle {
  return {
    id: 17,
    publicId: 'venta-17',
    serie: 'A-',
    numero: 17,
    fecha: '2026-08-25T10:30:00.000Z',
    empleadoNombre: 'Empleado detalle',
    cliente: {
      publicId: 'cliente-1',
      nombre: 'Cliente test',
      email: 'cliente@example.com',
    },
    totalCents: 2_000,
    pagos: [
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        nombre: 'Tarjeta',
        importeCents: 2_000,
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
        unidades: 2,
        pvpMicros: 10_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        importeMicros: 20_000_000,
        regalo: false,
      },
    ],
    totalUnidades: 2,
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
  };
}
