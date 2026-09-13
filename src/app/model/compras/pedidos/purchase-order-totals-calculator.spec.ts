import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import PurchaseOrderTotalsCalculator from '@model/compras/pedidos/purchase-order-totals-calculator';
import type {
  PurchaseOrderTaxBreakdown,
  PurchaseOrderTotals,
} from '@model/compras/pedidos/purchase-order-totals.interface';
import { describe, expect, it } from 'vitest';

/**
 * Construye una línea económica representativa
 * para probar los totales de Pedido.
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
    observacionesPedido: null,
    referencia: 'REF-9',
    marcaNombre: 'Marca',
    codigoBarras: null,
    tieneCodigoBarrasAdicional: false,
    unidades: 1,
    stockActual: 10,
    stockFinal: 11,
    palbMicros: 1_000_000,
    pucMicros: 1_210_000,
    pvpMicros: 2_000_000,
    margenMicroporcentaje: 39_500_000,
    ivaBps: 2100,
    recargoEquivalenciaBps: 520,
    descuentoBps: 0,
    ...overrides,
  };
}

describe('PurchaseOrderTotalsCalculator', (): void => {
  it('devuelve todos los totales a cero para un Pedido vacío', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular([], 0, 0, false);

    expect(result).toEqual({
      totalLineas: 0,
      totalArticulos: 0,
      totalBeneficiosMicros: 0,
      totalPvpMicros: 0,
      portesMicros: 0,
      mediaMargenMicroporcentaje: 0,
      subtotalMicros: 0,
      descuentoGlobalBps: 0,
      ivaMicros: 0,
      recargoEquivalenciaMicros: 0,
      desgloseFiscal: [],
      totalFacturaMicros: 0,
      totalSinIvaMicros: 0,
    });
  });

  it('calcula una línea sin R.E.', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          unidades: 2,
        }),
      ],
      0,
      0,
      false,
    );

    expect(result.totalLineas).toBe(1);
    expect(result.totalArticulos).toBe(2);
    expect(result.subtotalMicros).toBe(2_000_000);
    expect(result.ivaMicros).toBe(420_000);
    expect(result.recargoEquivalenciaMicros).toBe(0);
    expect(result.totalFacturaMicros).toBe(2_420_000);
  });

  it('aplica conjuntamente descuento de línea y descuento global a la base', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          unidades: 2,
          palbMicros: 10_000_000,
          descuentoBps: 1000,
          ivaBps: 1000,
          recargoEquivalenciaBps: 140,
        }),
      ],
      0,
      2000,
      true,
    );

    expect(result.subtotalMicros).toBe(14_400_000);

    expect(result.ivaMicros).toBe(1_440_000);

    expect(result.recargoEquivalenciaMicros).toBe(201_600);

    expect(result.totalFacturaMicros).toBe(16_041_600);
  });

  it('mantiene la compatibilidad del ejemplo UE legacy', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          palbMicros: 25_740_000,
          ivaBps: 1000,
          recargoEquivalenciaBps: 140,
        }),
      ],
      0,
      0,
      true,
    );

    expect(result.subtotalMicros).toBe(25_740_000);

    expect(result.ivaMicros).toBe(2_574_000);

    expect(result.recargoEquivalenciaMicros).toBe(360_360);

    expect(result.totalFacturaMicros).toBe(28_674_360);

    expect(result.totalSinIvaMicros).toBe(25_740_000);
  });

  it('aplica IVA 21 y RE 5,2 a portes sin aplicarles descuento global', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [],
      10_000_000,
      5000,
      true,
    );

    expect(result.subtotalMicros).toBe(10_000_000);

    expect(result.ivaMicros).toBe(2_100_000);

    expect(result.recargoEquivalenciaMicros).toBe(520_000);

    expect(result.totalFacturaMicros).toBe(12_620_000);

    expect(result.desgloseFiscal).toEqual([
      {
        ivaBps: 2100,
        recargoEquivalenciaBps: 520,
        baseMicros: 10_000_000,
        ivaMicros: 2_100_000,
        recargoEquivalenciaMicros: 520_000,
      },
    ]);
  });

  it('agrupa bases pertenecientes a la misma pareja fiscal', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          palbMicros: 5_000_000,
        }),
      ],
      10_000_000,
      0,
      true,
    );

    expect(result.desgloseFiscal).toEqual([
      {
        ivaBps: 2100,
        recargoEquivalenciaBps: 520,
        baseMicros: 15_000_000,
        ivaMicros: 3_150_000,
        recargoEquivalenciaMicros: 780_000,
      },
    ]);
  });

  it('genera un desglose independiente para distintos tipos fiscales', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          idArticulo: 1,
          ivaBps: 400,
          recargoEquivalenciaBps: 50,
        }),
        createLine({
          idArticulo: 2,
          ivaBps: 1000,
          recargoEquivalenciaBps: 140,
        }),
      ],
      0,
      0,
      true,
    );

    const breakdown: readonly PurchaseOrderTaxBreakdown[] = result.desgloseFiscal;

    expect(
      breakdown.map((row: PurchaseOrderTaxBreakdown): [number, number] => [
        row.ivaBps,
        row.recargoEquivalenciaBps,
      ]),
    ).toEqual([
      [400, 50],
      [1000, 140],
    ]);
  });

  it('excluye portes y descuento global del Total beneficios', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          unidades: 2,
          pucMicros: 6_000_000,
          pvpMicros: 10_000_000,
        }),
      ],
      5_000_000,
      5000,
      false,
    );

    expect(result.totalBeneficiosMicros).toBe(8_000_000);

    expect(result.totalPvpMicros).toBe(20_000_000);
  });

  it('calcula Media margen mediante la fórmula legacy incluyendo portes', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          unidades: 1,
          pucMicros: 60_000_000,
          pvpMicros: 100_000_000,
        }),
      ],
      10_000_000,
      7500,
      false,
    );

    expect(result.mediaMargenMicroporcentaje).toBe(30_000_000);
  });

  it('permite margen medio negativo', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          pucMicros: 12_000_000,
          pvpMicros: 10_000_000,
        }),
      ],
      0,
      0,
      false,
    );

    expect(result.mediaMargenMicroporcentaje).toBe(-20_000_000);
  });

  it('un descuento global del cien por cien elimina únicamente las bases de líneas', (): void => {
    const result: PurchaseOrderTotals = PurchaseOrderTotalsCalculator.calcular(
      [
        createLine({
          palbMicros: 20_000_000,
        }),
      ],
      5_000_000,
      10_000,
      false,
    );

    expect(result.subtotalMicros).toBe(5_000_000);

    expect(result.ivaMicros).toBe(1_050_000);
  });

  it('rechaza portes negativos y descuentos globales fuera de rango', (): void => {
    expect(() => PurchaseOrderTotalsCalculator.calcular([], -1, 0, false)).toThrow(
      'Portes no puede ser negativo.',
    );

    expect(() => PurchaseOrderTotalsCalculator.calcular([], 0, 10_001, false)).toThrow(
      'Descuento global debe estar entre 0 % y 100 %.',
    );
  });
});
