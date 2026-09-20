import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  TipoPagoEstadisticasConsulta,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';
import PaymentTypeStatisticsComponent from '@modules/gestion/components/payment-type-statistics/payment-type-statistics.component';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PaymentTypeStatisticsComponent', (): void => {
  let getEstadisticasMock: ReturnType<typeof vi.fn>;

  beforeEach(async (): Promise<void> => {
    getEstadisticasMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [PaymentTypeStatisticsComponent],
      providers: [
        {
          provide: TiposPagoService,
          useValue: {
            getEstadisticas: getEstadisticasMock,
          },
        },
      ],
    })
      .overrideComponent(PaymentTypeStatisticsComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();
  });

  it('carga inicialmente el mes actual al activar la pestaña', async (): Promise<void> => {
    const result: TipoPagoEstadisticasResultado = createResult();

    getEstadisticasMock.mockResolvedValue(result);

    const fixture: ComponentFixture<PaymentTypeStatisticsComponent> = TestBed.createComponent(
      PaymentTypeStatisticsComponent,
    );

    const tipoPago: TipoPago = createTipoPago();

    fixture.componentRef.setInput('tipoPago', tipoPago);

    fixture.componentRef.setInput('active', true);

    fixture.detectChanges();

    await fixture.whenStable();

    const now: Date = new Date();

    expect(getEstadisticasMock).toHaveBeenCalledWith({
      idTipoPago: 2,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    } satisfies TipoPagoEstadisticasConsulta);

    expect(fixture.componentInstance.result()).toBe(result);
  });

  it('no consulta mientras la pestaña no está activa', async (): Promise<void> => {
    getEstadisticasMock.mockResolvedValue(createResult());

    const fixture: ComponentFixture<PaymentTypeStatisticsComponent> = TestBed.createComponent(
      PaymentTypeStatisticsComponent,
    );

    fixture.componentRef.setInput('tipoPago', createTipoPago());

    fixture.componentRef.setInput('active', false);

    fixture.detectChanges();

    await fixture.whenStable();

    expect(getEstadisticasMock).not.toHaveBeenCalled();
  });

  it('consulta todo el histórico al seleccionar Todos los años', async (): Promise<void> => {
    getEstadisticasMock.mockResolvedValue(createResult());

    const fixture: ComponentFixture<PaymentTypeStatisticsComponent> = TestBed.createComponent(
      PaymentTypeStatisticsComponent,
    );

    const component: PaymentTypeStatisticsComponent = fixture.componentInstance;

    fixture.componentRef.setInput('tipoPago', createTipoPago());

    fixture.componentRef.setInput('active', true);

    fixture.detectChanges();

    await fixture.whenStable();

    getEstadisticasMock.mockClear();

    component.onYearChange({
      value: 'all',
    } as never);

    fixture.detectChanges();

    await fixture.whenStable();

    expect(getEstadisticasMock).toHaveBeenCalledWith({
      idTipoPago: 2,
      year: null,
      month: null,
    });
  });

  it('expone el error de la consulta para permitir reintentar', async (): Promise<void> => {
    getEstadisticasMock.mockRejectedValueOnce(new Error('Database error'));

    const fixture: ComponentFixture<PaymentTypeStatisticsComponent> = TestBed.createComponent(
      PaymentTypeStatisticsComponent,
    );

    fixture.componentRef.setInput('tipoPago', createTipoPago());

    fixture.componentRef.setInput('active', true);

    fixture.detectChanges();

    await fixture.whenStable();

    expect(fixture.componentInstance.error()).toBe('Database error');

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('formatea las cuatro métricas del resumen', async (): Promise<void> => {
    getEstadisticasMock.mockResolvedValue(createResult());

    const fixture: ComponentFixture<PaymentTypeStatisticsComponent> = TestBed.createComponent(
      PaymentTypeStatisticsComponent,
    );

    fixture.componentRef.setInput('tipoPago', createTipoPago());

    fixture.componentRef.setInput('active', true);

    fixture.detectChanges();

    await fixture.whenStable();

    const component: PaymentTypeStatisticsComponent = fixture.componentInstance;

    expect(component.formatTotal()).toContain('10,00');

    expect(component.formatOperations()).toBe('2');

    expect(component.formatAverage()).toContain('5,00');

    expect(component.formatPercentage()).toBe('66,67 %');
  });
});

/**
 * Crea el tipo de pago utilizado
 * por los tests del componente.
 */
function createTipoPago(): TipoPago {
  return new TipoPago().fromInterface({
    id: 2,
    publicId: 'tipo-pago-visa',
    nombre: 'VISA',
    slug: 'visa',
    foto: 'osumi://assets/files/payment-types/visa.webp',
    afectaCaja: false,
    orden: 1,
    fisico: true,
  });
}

/**
 * Crea una respuesta estadística
 * completa para las pruebas.
 */
function createResult(): TipoPagoEstadisticasResultado {
  return {
    availableYears: [2025, 2026],
    points: [
      {
        year: 2026,
        month: 9,
        day: 1,
        importeCents: 1_500,
      },
      {
        year: 2026,
        month: 9,
        day: 2,
        importeCents: -500,
      },
    ],
    totalImporteCents: 1_000,
    operaciones: 2,
    importeMedioCents: 500,
    porcentajeTotalBps: 6_667,
  };
}
