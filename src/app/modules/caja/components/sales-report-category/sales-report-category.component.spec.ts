import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InformeVentasCategoria } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import SalesReportCategoryComponent from '@modules/caja/components/sales-report-category/sales-report-category.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SalesReportCategoryComponent', (): void => {
  let fixture: ComponentFixture<SalesReportCategoryComponent>;

  let component: SalesReportCategoryComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [SalesReportCategoryComponent],
    })
      .overrideComponent(SalesReportCategoryComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesReportCategoryComponent);

    component = fixture.componentInstance;

    fixture.componentRef.setInput('categoria', createCategoria());

    fixture.componentRef.setInput('groupByBrand', false);

    fixture.componentRef.setInput('depth', 0);

    fixture.detectChanges();
  });

  it('inicializa cada categoría expandida', (): void => {
    expect(component.expanded()).toBe(true);

    expect(component.hasChildren()).toBe(true);
  });

  it('permite colapsar y volver a expandir la categoría', (): void => {
    component.toggle();

    expect(component.expanded()).toBe(false);

    component.toggle();

    expect(component.expanded()).toBe(true);
  });
});

/**
 * Construye una categoría con contenido directo.
 */
function createCategoria(): InformeVentasCategoria {
  return {
    idCategoria: 1,
    categoriaPublicId: 'categoria-1',
    nombre: 'Categoría',
    importeMicros: 1_000_000,
    unidades: 1,
    ventasPvpMicros: 1_000_000,
    beneficioMicros: 400_000,
    margenBps: 4000,

    articulos: [
      {
        idArticulo: 1,
        articuloPublicId: 'articulo-1',
        idMarcaSnapshot: 1,
        marca: 'Marca',
        nombre: 'Artículo',
        importeMicros: 1_000_000,
        unidades: 1,
        ventasPvpMicros: 1_000_000,
        beneficioMicros: 400_000,
        margenBps: 4000,
      },
    ],

    marcas: [
      {
        idMarcaSnapshot: 1,
        nombre: 'Marca',
        importeMicros: 1_000_000,
        unidades: 1,
        ventasPvpMicros: 1_000_000,
        beneficioMicros: 400_000,
        margenBps: 4000,
      },
    ],

    subcategorias: [],
  };
}
