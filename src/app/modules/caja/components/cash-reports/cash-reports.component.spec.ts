import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type InformeTipo from '@desktop-contracts/caja/informes/informe-tipo.type';
import type Categoria from '@model/categorias/categoria.model';
import CashReportsComponent from '@modules/caja/components/cash-reports/cash-reports.component';
import CategoriasService from '@services/articulos/categorias.service';
import CajaInformesService from '@services/caja/caja-informes.service';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('CashReportsComponent', (): void => {
  let fixture: ComponentFixture<CashReportsComponent>;

  let component: CashReportsComponent;

  let openSimpleMock: Mock;
  let openDetalladoMock: Mock;
  let loadCategoriasMock: Mock;

  let categoriasPlain: WritableSignal<readonly Categoria[]>;

  beforeEach(async (): Promise<void> => {
    openSimpleMock = vi.fn().mockResolvedValue(undefined);
    openDetalladoMock = vi.fn().mockResolvedValue(undefined);
    loadCategoriasMock = vi.fn().mockResolvedValue(undefined);

    categoriasPlain = signal<readonly Categoria[]>([]);

    await TestBed.configureTestingModule({
      imports: [CashReportsComponent],

      providers: [
        {
          provide: CajaInformesService,
          useValue: {
            openSimple: openSimpleMock,
            openDetallado: openDetalladoMock,
          },
        },
        {
          provide: CategoriasService,
          useValue: {
            load: loadCategoriasMock,
            categoriasPlain: categoriasPlain.asReadonly(),
          },
        },
      ],
    })
      .overrideComponent(CashReportsComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CashReportsComponent);

    component = fixture.componentInstance;
  });

  it('inicializa Simple con el mes y año actuales', (): void => {
    const now: Date = new Date();

    expect(component.selectedType()).toBe('simple');

    expect(component.selectedMonth()).toBe(now.getMonth() + 1);

    expect(component.selectedYear()).toBe(now.getFullYear());
  });

  it('ofrece el año actual y los cuatro anteriores', (): void => {
    const currentYear: number = new Date().getFullYear();

    expect(component.years).toEqual([
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4,
    ]);
  });

  it('permite generar Simple y Detallado pero no Ventas', (): void => {
    expect(component.canGenerate()).toBe(true);

    component.setType('detallado');

    expect(component.canGenerate()).toBe(true);

    component.setType('ventas');

    expect(component.canGenerate()).toBe(false);
  });

  it('muestra el selector de categoría únicamente para Ventas', (): void => {
    expect(component.showCategory()).toBe(false);

    component.setType('ventas');

    expect(component.showCategory()).toBe(true);

    component.setType('simple');

    expect(component.showCategory()).toBe(false);
  });

  it('abre el Informe Simple con los filtros actuales', async (): Promise<void> => {
    component.setYear(2025);
    component.setMonth('todos');

    await component.generate();

    expect(openSimpleMock).toHaveBeenCalledWith({
      year: 2025,
      month: 'todos',
    });

    expect(component.loading()).toBe(false);

    expect(component.error()).toBeNull();
  });

  it('abre el Informe Detallado con los filtros actuales', async (): Promise<void> => {
    component.setType('detallado');

    component.setYear(2025);

    component.setMonth('todos');

    await component.generate();

    expect(openDetalladoMock).toHaveBeenCalledWith({
      year: 2025,
      month: 'todos',
    });

    expect(openSimpleMock).not.toHaveBeenCalled();

    expect(component.loading()).toBe(false);

    expect(component.error()).toBeNull();
  });

  it('no genera el Informe de Ventas todavía no implementado', async (): Promise<void> => {
    const type: InformeTipo = 'ventas';

    component.setType(type);

    await component.generate();

    expect(openSimpleMock).not.toHaveBeenCalled();

    expect(openDetalladoMock).not.toHaveBeenCalled();
  });

  it('limpia un error anterior al cambiar filtros', (): void => {
    component.error.set('Error anterior');

    component.setMonth(1);

    expect(component.error()).toBeNull();
  });
});
