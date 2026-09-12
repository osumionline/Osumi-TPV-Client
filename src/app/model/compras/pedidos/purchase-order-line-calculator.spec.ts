import PurchaseOrderLineCalculator from '@model/compras/pedidos/purchase-order-line-calculator';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import { describe, expect, it } from 'vitest';

/**
 * Construye una línea económica representativa
 * para las pruebas del calculador de Pedido.
 */
function createLine(overrides: Partial<PurchaseOrderLineState> = {}): PurchaseOrderLineState {
  return {
    key: 'article:9',
    id: null,
    publicId: null,
    orden: 0,
    idArticulo: 9,
    localizador: 267960,
    nombreArticulo: 'Artículo de prueba',
    referencia: 'REF-9',
    marcaNombre: 'Marca',
    codigoBarras: null,
    tieneCodigoBarrasAdicional: false,
    unidades: 7,
    stockActual: 10,
    stockFinal: 17,
    palbMicros: 800_000,
    pucMicros: 950_000,
    pvpMicros: 1_500_000,
    margenMicroporcentaje: 36_666_667,
    ivaBps: 2100,
    recargoEquivalenciaBps: 520,
    descuentoBps: 1000,
    ...overrides,
  };
}

describe('PurchaseOrderLineCalculator', (): void => {
  it('recalcula PUC y Margen al cambiar Precio albarán con R.E.', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarPrecioAlbaran(
      createLine(),
      800_000,
      true,
    );

    expect(result.palbMicros).toBe(800_000);

    expect(result.pucMicros).toBe(908_640);

    expect(result.margenMicroporcentaje).toBe(39_424_000);
  });

  it('no aplica RE al PUC cuando el Pedido lo tiene desactivado', (): void => {
    const result: PurchaseOrderLineState =
      PurchaseOrderLineCalculator.recalcularPorRecargoEquivalencia(createLine(), false);

    expect(result.pucMicros).toBe(871_200);

    expect(result.margenMicroporcentaje).toBe(41_920_000);

    expect(result.recargoEquivalenciaBps).toBe(520);
  });

  it('vuelve a aplicar el RE conservado al activarlo', (): void => {
    const withoutRe: PurchaseOrderLineState =
      PurchaseOrderLineCalculator.recalcularPorRecargoEquivalencia(createLine(), false);

    const withRe: PurchaseOrderLineState =
      PurchaseOrderLineCalculator.recalcularPorRecargoEquivalencia(withoutRe, true);

    expect(withRe.pucMicros).toBe(908_640);

    expect(withRe.recargoEquivalenciaBps).toBe(520);
  });

  it('recalcula PUC y Margen al cambiar el descuento de línea', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarDescuento(
      createLine({
        descuentoBps: 0,
      }),
      1000,
      true,
    );

    expect(result.descuentoBps).toBe(1000);

    expect(result.pucMicros).toBe(908_640);

    expect(result.margenMicroporcentaje).toBe(39_424_000);
  });

  it('permite aplicar un descuento del cien por cien', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarDescuento(
      createLine(),
      10_000,
      true,
    );

    expect(result.pucMicros).toBe(0);

    expect(result.margenMicroporcentaje).toBe(100_000_000);
  });

  it('cambia IVA y RE como una única pareja fiscal', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarFiscalidad(
      createLine(),
      1000,
      140,
      true,
    );

    expect(result.ivaBps).toBe(1000);

    expect(result.recargoEquivalenciaBps).toBe(140);

    expect(result.pucMicros).toBe(802_080);

    expect(result.margenMicroporcentaje).toBe(46_528_000);
  });

  it('recalcula el Margen al cambiar PVP sin modificar PUC', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarPvp(
      createLine({
        pucMicros: 1_200_000,
      }),
      1_000_000,
    );

    expect(result.pucMicros).toBe(1_200_000);

    expect(result.pvpMicros).toBe(1_000_000);

    expect(result.margenMicroporcentaje).toBe(-20_000_000);
  });

  it('usa margen cero cuando el PVP es cero', (): void => {
    const result: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarPvp(
      createLine(),
      0,
    );

    expect(result.margenMicroporcentaje).toBe(0);
  });

  it('calcula Total como Unidades por PUC en microeuros', (): void => {
    const result: number = PurchaseOrderLineCalculator.calcularTotalMicros(
      createLine({
        unidades: 7,
        pucMicros: 908_640,
      }),
    );

    expect(result).toBe(6_360_480);
  });

  it('rechaza descuentos fuera del rango permitido', (): void => {
    expect(() =>
      PurchaseOrderLineCalculator.actualizarDescuento(createLine(), 10_001, true),
    ).toThrow('El descuento debe estar entre 0 % y 100 %.');
  });

  it('rechaza importes económicos negativos', (): void => {
    expect(() =>
      PurchaseOrderLineCalculator.actualizarPrecioAlbaran(createLine(), -1, true),
    ).toThrow('El valor de Precio albarán no puede ser negativo.');

    expect(() => PurchaseOrderLineCalculator.actualizarPvp(createLine(), -1)).toThrow(
      'El valor de PVP no puede ser negativo.',
    );
  });

  it('rechaza valores que no son enteros seguros', (): void => {
    expect(() =>
      PurchaseOrderLineCalculator.actualizarPrecioAlbaran(
        createLine(),
        Number.MAX_SAFE_INTEGER + 1,
        true,
      ),
    ).toThrow('El valor de Precio albarán debe ser un entero seguro.');
  });
});
