import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InformeDetalladoResultado } from '@desktop-contracts/caja/informes/informe-detallado.interface';
import DetailedReportComponent from '@modules/caja/components/detailed-report/detailed-report.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('DetailedReportComponent', (): void => {
  let fixture: ComponentFixture<DetailedReportComponent>;

  let component: DetailedReportComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [DetailedReportComponent],
    })
      .overrideComponent(DetailedReportComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DetailedReportComponent);

    component = fixture.componentInstance;

    fixture.componentRef.setInput('result', createResult());

    fixture.detectChanges();
  });

  it('muestra una tendencia positiva', (): void => {
    expect(component.getTrendSymbol(250)).toBe('↑');

    expect(component.formatMarginDifference(250)).toBe('+2,50 p.p.');
  });

  it('muestra una tendencia negativa', (): void => {
    expect(component.getTrendSymbol(-175)).toBe('↓');

    expect(component.formatMarginDifference(-175)).toBe('-1,75 p.p.');
  });

  it('muestra igualdad cuando la diferencia es cero', (): void => {
    expect(component.getTrendSymbol(0)).toBe('=');

    expect(component.formatMarginDifference(0)).toBe('0,00 p.p.');
  });

  it('muestra estado neutro cuando no existe comparativa', (): void => {
    expect(component.getTrendSymbol(null)).toBe('=');

    expect(component.formatMarginDifference(null)).toBe('—');
  });

  it('formatea diferencias de número de ventas con signo', (): void => {
    expect(component.formatIntegerDifference(4)).toBe('+4');

    expect(component.formatIntegerDifference(-3)).toBe('-3');

    expect(component.formatIntegerDifference(0)).toBe('0');
  });
});

/**
 * Construye un resultado mínimo representativo
 * para los tests de presentación.
 */
function createResult(): InformeDetalladoResultado {
  return {
    ventas: {
      numeroVentas: 10,
      numeroVentasAnterior: 8,
      diferenciaNumeroVentas: 2,
      margenBps: 3500,
      margenAnteriorBps: 3200,
      diferenciaMargenBps: 300,
    },

    marcas: [],

    marcasTotales: {
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
      margenBps: 0,
    },

    articulos: [],

    articulosTotales: {
      totalUnidadesVendidas: 0,
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
    },
  };
}
