import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InformeSimpleItem,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import SimpleReportComponent from '@modules/caja/components/simple-report/simple-report.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SimpleReportComponent', (): void => {
  let fixture: ComponentFixture<SimpleReportComponent>;
  let component: SimpleReportComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [SimpleReportComponent],
    })
      .overrideComponent(SimpleReportComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SimpleReportComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('result', createResult());

    fixture.componentRef.setInput('year', 2026);

    fixture.componentRef.setInput('month', 9);

    fixture.detectChanges();
  });

  it('muestra el periodo mensual en el título', (): void => {
    expect(component.getTitle()).toBe('Septiembre de 2026');
  });

  it('muestra únicamente el año cuando el periodo es Todos', (): void => {
    fixture.componentRef.setInput('month', 'todos');

    fixture.detectChanges();

    expect(component.getTitle()).toBe('2026');
  });

  it('mantiene el formato de rango de tickets del legacy', (): void => {
    expect(
      component.getTicketRange(
        {
          serie: '',
          numero: 9486,
        },
        {
          serie: '',
          numero: 9500,
        },
      ),
    ).toBe('9486 - 9500');

    expect(
      component.getTicketRange(
        {
          serie: 'A',
          numero: 1,
        },
        {
          serie: 'A',
          numero: 3,
        },
      ),
    ).toBe('A-1 - A-3');
  });

  it('muestra guiones cuando no existen tickets', (): void => {
    expect(component.getTicketRange(null, null)).toBe('------');
  });

  it('recupera el importe de un tipo de pago', (): void => {
    expect(
      component.getTipoPagoImporte(
        [
          {
            tipoPagoPublicId: 'efectivo',
            importeCents: 1250,
          },
        ],
        'efectivo',
      ),
    ).toBe(1250);

    expect(component.getTipoPagoImporte([], 'efectivo')).toBe(0);
  });

  it('genera una etiqueta diaria con día de semana', (): void => {
    const item: InformeSimpleItem = createResult().items[0];

    expect(component.getRowLabel(item)).toMatch(/^1\s.+$/);
  });
});

/**
 * Construye un resultado representativo
 * para los tests de presentación.
 */
function createResult(): InformeSimpleResultado {
  return {
    granularidad: 'dia',

    tiposPago: [
      {
        publicId: 'efectivo',
        nombre: 'Efectivo',
        slug: 'efectivo',
        orden: 0,
      },
    ],

    items: [
      {
        year: 2026,
        month: 9,
        day: 1,
        numeroVentas: 1,
        primerTicket: {
          serie: '',
          numero: 9486,
        },
        ultimoTicket: {
          serie: '',
          numero: 9486,
        },
        importesTipoPago: [
          {
            tipoPagoPublicId: 'efectivo',
            importeCents: 1000,
          },
        ],
        totalCents: 1000,
        sumaCents: 1000,
      },
    ],

    totales: {
      numeroVentas: 1,
      primerTicket: {
        serie: '',
        numero: 9486,
      },
      ultimoTicket: {
        serie: '',
        numero: 9486,
      },
      importesTipoPago: [
        {
          tipoPagoPublicId: 'efectivo',
          importeCents: 1000,
        },
      ],
      totalCents: 1000,
      sumaCents: 1000,
    },
  };
}
