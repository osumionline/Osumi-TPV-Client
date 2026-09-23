import { Component, input, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import CashRegisterComponent from '@modules/caja/pages/cash-register/cash-register.component';
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

@Component({
  selector: 'otpv-cash-outflows',
  template: '',
})
class CashOutflowsStubComponent {}

@Component({
  selector: 'otpv-cash-closing',
  template: '',
})
class CashClosingStubComponent {}

@Component({
  selector: 'otpv-header',
  template: '',
})
class HeaderStubComponent {
  readonly selectedOption = input<string>('');
  readonly appName = input<string>('');
}

@Component({
  selector: 'otpv-cash-reports',
  template: '',
})
class CashReportsStubComponent {}

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
        set: {
          imports: [
            HeaderStubComponent,
            CashClosingStubComponent,
            CashOutflowsStubComponent,
            HistoricalSalesStubComponent,
            CashReportsStubComponent,
          ],
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

  it('muestra el componente de salidas al seleccionar su pestaña', (): void => {
    component.selectSection('outflows');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(CashOutflowsStubComponent))).not.toBeNull();
  });

  it('muestra Informes al seleccionar su pestaña', (): void => {
    component.selectSection('reports');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(CashReportsStubComponent))).not.toBeNull();
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

  it('muestra el cierre de caja al seleccionar su pestaña', (): void => {
    component.selectSection('closing');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(CashClosingStubComponent))).not.toBeNull();
  });
});
