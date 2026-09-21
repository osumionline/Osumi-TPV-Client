import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type { CajaCierreInterface } from '@desktop-contracts/caja/caja-cierre.interface';
import createCajaCierreFormInitialValue from '@model/caja/caja-cierre-form.initial-value';
import CashClosingComponent from '@modules/caja/components/cash-closing/cash-closing.component';
import CajaCierreService from '@services/caja/caja-cierre.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('CashClosingComponent', (): void => {
  let fixture: ComponentFixture<CashClosingComponent>;
  let component: CashClosingComponent;

  let cajaAbierta: WritableSignal<CajaAbiertaInterface | null>;
  let reloadMock: Mock;
  let getCierreMock: Mock;

  beforeEach(async (): Promise<void> => {
    cajaAbierta = signal<CajaAbiertaInterface | null>({
      id: 1,
      publicId: 'caja-1',
      idTerminal: 1,
      apertura: '2026-09-21T08:00:00.000Z',
      importeAperturaCents: 10_000,
    });

    reloadMock = vi.fn().mockResolvedValue(undefined);

    getCierreMock = vi.fn().mockResolvedValue(createCierre());

    await TestBed.configureTestingModule({
      imports: [CashClosingComponent],
      providers: [
        {
          provide: CajaCierreService,
          useValue: {
            getCierre: getCierreMock,
          },
        },
        {
          provide: VentasContextService,
          useValue: {
            cajaAbierta: cajaAbierta.asReadonly(),
            reload: reloadMock,
          },
        },
      ],
    })
      .overrideComponent(CashClosingComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CashClosingComponent);
    component = fixture.componentInstance;
  });

  it('carga el cierre de la caja actualmente abierta', async (): Promise<void> => {
    await component.load();

    expect(reloadMock).toHaveBeenCalledTimes(1);

    expect(getCierreMock).toHaveBeenCalledWith({
      cajaPublicId: 'caja-1',
    });

    expect(component.cierre()).toEqual(createCierre());
    expect(component.loading()).toBe(false);
  });

  it('no solicita un cierre cuando no hay caja abierta', async (): Promise<void> => {
    cajaAbierta.set(null);

    await component.load();

    expect(getCierreMock).not.toHaveBeenCalled();
    expect(component.cierre()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('mantiene diferencia y saldo siguiente pendientes hasta realizar el recuento', async (): Promise<void> => {
    await component.load();

    expect(component.importeRealCents()).toBeNull();
    expect(component.diferenciaCents()).toBeNull();
    expect(component.saldoSiguienteCents()).toBeNull();
  });

  it('aplica las fórmulas históricas usando el efectivo contado', async (): Promise<void> => {
    await component.load();

    const initialValue = createCajaCierreFormInitialValue();

    component.cierreForm().reset({
      ...initialValue,

      retiradoEuros: 20,
      entradaEuros: 10,

      recuento: {
        ...initialValue.recuento,

        /*
         * 100 + 20 + 10 + 5 = 135 €
         */
        euro5: 1,
        euro10: 1,
        euro20: 1,
        euro100: 1,
      },
    });

    expect(component.importeRealCents()).toBe(13_500);
    expect(component.retiradoCents()).toBe(2_000);
    expect(component.entradaCents()).toBe(1_000);

    /*
     * 13500 + 2000 - 15500 = 0
     */
    expect(component.diferenciaCents()).toBe(0);

    /*
     * 13500 + 1000 = 14500
     */
    expect(component.saldoSiguienteCents()).toBe(14_500);
  });

  it('calcula el importe real usando monedas y billetes', async (): Promise<void> => {
    await component.load();

    const initialValue = createCajaCierreFormInitialValue();

    component.cierreForm().reset({
      ...initialValue,

      recuento: {
        ...initialValue.recuento,
        cent1: 3,
        cent2: 2,
        cent5: 1,
        cent50: 2,
        euro1: 3,
        euro20: 2,
        euro500: 1,
      },
    });

    /*
     *   3 × 0,01 =   0,03
     *   2 × 0,02 =   0,04
     *   1 × 0,05 =   0,05
     *   2 × 0,50 =   1,00
     *   3 × 1,00 =   3,00
     *   2 × 20   =  40,00
     *   1 × 500  = 500,00
     *
     * Total = 544,12 €
     */
    expect(component.importeRealCents()).toBe(54_412);
  });

  it('distingue un recuento de cero euros de un recuento todavía no realizado', async (): Promise<void> => {
    await component.load();

    expect(component.importeRealCents()).toBeNull();

    const initialValue = createCajaCierreFormInitialValue();

    component.cierreForm().reset({
      ...initialValue,

      recuento: {
        ...initialValue.recuento,
        cent1: 0,
      },
    });

    expect(component.importeRealCents()).toBe(0);
  });

  it('permite desplegar y contraer el recuento físico', (): void => {
    expect(component.recuentoOpen()).toBe(false);

    component.toggleRecuento();

    expect(component.recuentoOpen()).toBe(true);

    component.toggleRecuento();

    expect(component.recuentoOpen()).toBe(false);
  });
});

/**
 * Construye un snapshot económico reutilizable.
 */
function createCierre(): CajaCierreInterface {
  return {
    cajaPublicId: 'caja-1',
    apertura: '2026-09-21T08:00:00.000Z',
    saldoInicialCents: 10_000,
    ventasAfectanCajaCents: 7_000,
    salidasCajaCents: 1_500,
    saldoFinalTeoricoCents: 15_500,
    tiposPago: [],
  };
}
