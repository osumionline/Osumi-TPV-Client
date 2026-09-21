import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import CashRegisterComponent from '@modules/caja/pages/cash-register/cash-register.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('CashRegisterComponent', (): void => {
  let fixture: ComponentFixture<CashRegisterComponent>;
  let component: CashRegisterComponent;
  let appData: WritableSignal<AppData | null>;

  beforeEach(async (): Promise<void> => {
    appData = signal<AppData | null>(null);

    await TestBed.configureTestingModule({
      imports: [CashRegisterComponent],
      providers: [
        provideRouter([]),
        {
          provide: AppDataService,
          useValue: {
            appData: appData.asReadonly(),
            load: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: DialogService,
          useValue: {
            alert: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashRegisterComponent);
    component = fixture.componentInstance;
  });

  it('muestra inicialmente el histórico de ventas', (): void => {
    expect(component.activeSection()).toBe('history');
  });

  it('define las cuatro secciones de Caja', (): void => {
    expect(component.sections).toEqual([
      {
        id: 'history',
        label: 'Histórico de ventas',
      },
      {
        id: 'outflows',
        label: 'Salidas caja',
      },
      {
        id: 'closing',
        label: 'Cerrar caja',
      },
      {
        id: 'reports',
        label: 'Informes',
      },
    ]);
  });

  it('permite cambiar la sección activa', (): void => {
    component.selectSection('closing');

    expect(component.activeSection()).toBe('closing');

    component.selectSection('reports');

    expect(component.activeSection()).toBe('reports');
  });

  it('renderiza el contenido correspondiente a la pestaña seleccionada', (): void => {
    fixture.detectChanges();

    let element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Histórico de ventas');

    component.selectSection('outflows');
    fixture.detectChanges();

    element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Gestión de las salidas manuales de efectivo.');

    component.selectSection('reports');
    fixture.detectChanges();

    expect(element.textContent).toContain('Este apartado se definirá más adelante.');
  });
});
