import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type { CajaCierreInterface } from '@desktop-contracts/caja/caja-cierre.interface';
import createCajaCierreFormInitialValue from '@model/caja/caja-cierre-form.initial-value';
import type CajaCierreTipoPagoModel from '@model/caja/caja-cierre-tipo-pago.model';
import CashClosingComponent from '@modules/caja/components/cash-closing/cash-closing.component';
import { DialogService } from '@osumi/angular-tools';
import CajaCierreService from '@services/caja/caja-cierre.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('CashClosingComponent', (): void => {
  let fixture: ComponentFixture<CashClosingComponent>;
  let component: CashClosingComponent;

  let cajaAbierta: WritableSignal<CajaAbiertaInterface | null>;
  let reloadMock: Mock;
  let getCierreMock: Mock;
  let closeMock: Mock;
  let clearMock: Mock;
  let confirmMock: Mock;
  let alertMock: Mock;

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
    closeMock = vi.fn().mockResolvedValue(undefined);
    clearMock = vi.fn();

    confirmMock = vi.fn().mockReturnValue(of(true));
    alertMock = vi.fn().mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [CashClosingComponent],
      providers: [
        {
          provide: VentasContextService,
          useValue: {
            cajaAbierta: cajaAbierta.asReadonly(),
            reload: reloadMock,
            clear: clearMock,
          },
        },
        {
          provide: CajaCierreService,
          useValue: {
            getCierre: getCierreMock,
            close: closeMock,
          },
        },
        {
          provide: DialogService,
          useValue: {
            confirm: confirmMock,
            alert: alertMock,
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

  it('excluye únicamente el Efectivo estructural del desglose inferior', async (): Promise<void> => {
    await component.load();

    expect(
      component.tiposPago().map((tipoPago: CajaCierreTipoPagoModel): string => tipoPago.slug),
    ).toEqual(['tarjeta', 'vale-efectivo', 'bizum', 'tarjeta-devoluciones']);
  });

  it('mantiene tipos de pago aunque no tengan operaciones', async (): Promise<void> => {
    await component.load();

    const bizum: CajaCierreTipoPagoModel | undefined = component
      .tiposPago()
      .find((tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.slug === 'bizum');

    expect(bizum).toBeDefined();
    expect(bizum?.operaciones).toBe(0);
    expect(bizum?.importeVentasCents).toBe(0);
  });
  it('inicializa el importe real de cada tipo con sus ventas', async (): Promise<void> => {
    await component.load();

    expect(
      component
        .tiposPago()
        .map((tipoPago: CajaCierreTipoPagoModel): number | null => tipoPago.importeRealCents),
    ).toEqual([12_500, 5_000, 0, -2_000]);
  });

  it('recalcula la diferencia al modificar el importe real', async (): Promise<void> => {
    await component.load();

    component.updateTipoPagoImporteReal('tipo-tarjeta', createInputEvent('130.50'));

    const tarjeta: CajaCierreTipoPagoModel | undefined = component
      .tiposPago()
      .find((tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.publicId === 'tipo-tarjeta');

    expect(tarjeta?.importeRealCents).toBe(13_050);

    expect(tarjeta === undefined ? null : component.getTipoPagoDiferenciaCents(tarjeta)).toBe(550);
  });

  it('despliega un tipo de pago sin modificar los demás', async (): Promise<void> => {
    await component.load();

    component.toggleTipoPago('tipo-tarjeta');

    const tarjeta = component
      .tiposPago()
      .find((tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.publicId === 'tipo-tarjeta');

    const vale = component
      .tiposPago()
      .find((tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.publicId === 'tipo-vale');

    expect(tarjeta?.expanded).toBe(true);
    expect(vale?.expanded).toBe(false);
  });

  it('conserva importes negativos procedentes de devoluciones', async (): Promise<void> => {
    await component.load();

    const devolucion = component
      .tiposPago()
      .find(
        (tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.publicId === 'tipo-devolucion',
      );

    expect(devolucion?.importeVentasCents).toBe(-2_000);
    expect(devolucion?.importeRealCents).toBe(-2_000);

    expect(devolucion === undefined ? null : component.getTipoPagoDiferenciaCents(devolucion)).toBe(
      0,
    );
  });

  it('no permite cerrar hasta realizar el recuento', async (): Promise<void> => {
    await component.load();

    expect(component.canClose()).toBe(false);

    prepareValidClosing(component);

    expect(component.canClose()).toBe(true);
  });

  it('construye el cierre con recuento, entrada, retirada y reales por tipo', async (): Promise<void> => {
    await component.load();

    prepareValidClosing(component);

    await component.closeCaja();

    expect(closeMock).toHaveBeenCalledWith({
      cajaPublicId: 'caja-1',
      retiradoCents: 2_000,
      entradaCents: 1_000,

      recuento: [
        {
          valorCents: 1,
          cantidad: 0,
        },
        {
          valorCents: 500,
          cantidad: 1,
        },
        {
          valorCents: 2_000,
          cantidad: 1,
        },
        {
          valorCents: 10_000,
          cantidad: 1,
        },
      ],

      tiposPago: [
        {
          tipoPagoPublicId: 'tipo-tarjeta',
          importeRealCents: 12_500,
        },
        {
          tipoPagoPublicId: 'tipo-vale',
          importeRealCents: 5_000,
        },
        {
          tipoPagoPublicId: 'tipo-bizum',
          importeRealCents: 0,
        },
        {
          tipoPagoPublicId: 'tipo-devolucion',
          importeRealCents: -2_000,
        },
      ],
    });
  });

  it('no cierra la caja si el usuario cancela la confirmación', async (): Promise<void> => {
    confirmMock.mockReturnValue(of(false));

    await component.load();

    prepareValidClosing(component);

    await component.closeCaja();

    expect(closeMock).not.toHaveBeenCalled();
    expect(clearMock).not.toHaveBeenCalled();
  });

  it('limpia y recarga el contexto después de cerrar correctamente', async (): Promise<void> => {
    await component.load();

    prepareValidClosing(component);

    /*
     * Ignoramos la recarga realizada por load().
     */
    reloadMock.mockClear();

    await component.closeCaja();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    expect(component.cierre()).toBeNull();
    expect(component.tiposPago()).toEqual([]);
    expect(component.recuentoOpen()).toBe(false);
  });

  it('advierte expresamente cuando el efectivo tiene una diferencia negativa', async (): Promise<void> => {
    await component.load();

    const initialValue = createCajaCierreFormInitialValue();

    component.cierreForm().reset({
      ...initialValue,

      recuento: {
        ...initialValue.recuento,

        /*
         * Solo 5 €, frente a 155 € teóricos.
         */
        euro5: 1,
      },
    });

    await component.closeCaja();

    expect(confirmMock).toHaveBeenCalledWith({
      title: 'Cerrar caja',
      content:
        'El recuento presenta una diferencia negativa. ¿Estás seguro de querer cerrar definitivamente esta caja?',
      warn: true,
      ok: 'Cerrar caja',
      cancel: 'Cancelar',
    });
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

    tiposPago: [
      {
        publicId: 'tipo-efectivo',
        nombre: 'Efectivo',
        slug: 'efectivo',
        afectaCaja: true,
        orden: 0,
        operaciones: 2,
        importeVentasCents: 2_000,
      },
      {
        publicId: 'tipo-tarjeta',
        nombre: 'Tarjeta',
        slug: 'tarjeta',
        afectaCaja: false,
        orden: 1,
        operaciones: 3,
        importeVentasCents: 12_500,
      },
      {
        publicId: 'tipo-vale',
        nombre: 'Vale efectivo',
        slug: 'vale-efectivo',
        afectaCaja: true,
        orden: 2,
        operaciones: 1,
        importeVentasCents: 5_000,
      },
      {
        publicId: 'tipo-bizum',
        nombre: 'Bizum',
        slug: 'bizum',
        afectaCaja: false,
        orden: 3,
        operaciones: 0,
        importeVentasCents: 0,
      },
      {
        publicId: 'tipo-devolucion',
        nombre: 'Tarjeta devoluciones',
        slug: 'tarjeta-devoluciones',
        afectaCaja: false,
        orden: 4,
        operaciones: 1,
        importeVentasCents: -2_000,
      },
    ],
  };
}

function createInputEvent(value: string): Event {
  const input: HTMLInputElement = document.createElement('input');

  input.type = 'number';
  input.value = value;

  return {
    currentTarget: input,
  } as unknown as Event;
}

function prepareValidClosing(component: CashClosingComponent): void {
  const initialValue = createCajaCierreFormInitialValue();

  component.cierreForm().reset({
    ...initialValue,

    retiradoEuros: 20,
    entradaEuros: 10,

    recuento: {
      ...initialValue.recuento,
      cent1: 0,
      euro5: 1,
      euro20: 1,
      euro100: 1,
    },
  });
}
