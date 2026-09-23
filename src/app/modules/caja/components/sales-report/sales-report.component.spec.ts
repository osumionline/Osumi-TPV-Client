import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InformeVentasResultado } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import SalesReportComponent from '@modules/caja/components/sales-report/sales-report.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SalesReportComponent', (): void => {
  let fixture: ComponentFixture<SalesReportComponent>;
  let component: SalesReportComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [SalesReportComponent],
    })
      .overrideComponent(SalesReportComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesReportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', createResult());
    fixture.detectChanges();
  });

  it('inicializa el informe sin agrupar por marca', (): void => {
    expect(component.groupByBrand()).toBe(false);
  });

  it('permite alternar la agrupación por marca', (): void => {
    component.setGroupByBrand(true);
    expect(component.groupByBrand()).toBe(true);
    component.setGroupByBrand(false);
    expect(component.groupByBrand()).toBe(false);
  });
});

/**
 * Construye un resultado mínimo
 * para los tests del componente.
 */
function createResult(): InformeVentasResultado {
  return {
    categoria: {
      idCategoria: 1,
      categoriaPublicId: 'categoria-1',
      nombre: 'Categoría',
      importeMicros: 1_000_000,
      unidades: 1,
      ventasPvpMicros: 1_000_000,
      beneficioMicros: 400_000,
      margenBps: 4000,
      articulos: [],
      marcas: [],
      subcategorias: [],
    },
  };
}
