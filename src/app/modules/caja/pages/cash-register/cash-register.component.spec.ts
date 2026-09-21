import { Component, input, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import CashRegisterComponent from '@modules/caja/pages/cash-register/cash-register.component';
import HistoricalSalesComponent from '@modules/ventas/components/historical-sales/historical-sales.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

@Component({
  selector: 'otpv-historical-sales',
  template: '',
})
class HistoricalSalesStubComponent {
  readonly embedded = input<boolean>(false);
}

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
    })
      .overrideComponent(CashRegisterComponent, {
        remove: {
          imports: [HistoricalSalesComponent],
        },
        add: {
          imports: [HistoricalSalesStubComponent],
        },
      })
      .compileComponents();

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
    component.selectSection('outflows');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Gestión de las salidas manuales de efectivo.');

    component.selectSection('reports');
    fixture.detectChanges();

    expect(element.textContent).toContain('Este apartado se definirá más adelante.');
  });

  it('muestra el histórico de ventas en modo embebido', (): void => {
    fixture.detectChanges();

    const historicalSalesDebugElement = fixture.debugElement.query(
      By.directive(HistoricalSalesStubComponent),
    );

    expect(historicalSalesDebugElement).not.toBeNull();

    const historicalSales =
      historicalSalesDebugElement.componentInstance as HistoricalSalesStubComponent;

    expect(historicalSales.embedded()).toBe(true);
  });
});
