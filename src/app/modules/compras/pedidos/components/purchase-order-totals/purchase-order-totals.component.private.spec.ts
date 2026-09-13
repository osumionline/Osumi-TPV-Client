import type { PurchaseOrderTotals } from '@model/compras/pedidos/purchase-order-totals.interface';
import {
  formatPurchaseOrderTotalsDecimal,
  getPurchaseOrderDisplayedTotalMicros,
  isPurchaseOrderTotalsTransientDecimal,
  limitPurchaseOrderTotalsDecimalFraction,
  parsePurchaseOrderTotalsDecimal,
} from '@modules/compras/pedidos/components/purchase-order-totals/purchase-order-totals.component.private';
import { describe, expect, it } from 'vitest';

/**
 * Construye unos totales mínimos representativos.
 */
function createTotals(overrides: Partial<PurchaseOrderTotals> = {}): PurchaseOrderTotals {
  return {
    totalLineas: 2,
    totalArticulos: 7,
    totalBeneficiosMicros: 8_000_000,
    totalPvpMicros: 20_000_000,
    portesMicros: 1_000_000,
    mediaMargenMicroporcentaje: 30_000_000,
    subtotalMicros: 15_000_000,
    descuentoGlobalBps: 500,
    ivaMicros: 3_150_000,
    recargoEquivalenciaMicros: 780_000,
    desgloseFiscal: [],
    totalFacturaMicros: 18_930_000,
    totalSinIvaMicros: 15_000_000,
    ...overrides,
  };
}

describe('purchase-order-totals.component.private', (): void => {
  it('convierte portes con coma a microeuros', (): void => {
    expect(parsePurchaseOrderTotalsDecimal('12,345678', 6)).toBe(12_345_678);
  });

  it('convierte descuentos a basis points', (): void => {
    expect(parsePurchaseOrderTotalsDecimal('5,25', 2)).toBe(525);
  });

  it('acepta punto decimal', (): void => {
    expect(parsePurchaseOrderTotalsDecimal('1.50', 2)).toBe(150);
  });

  it('detecta valores transitorios', (): void => {
    expect(isPurchaseOrderTotalsTransientDecimal('')).toBe(true);

    expect(isPurchaseOrderTotalsTransientDecimal('12,')).toBe(true);

    expect(isPurchaseOrderTotalsTransientDecimal('12,5')).toBe(false);
  });

  it('limita la precisión decimal', (): void => {
    expect(limitPurchaseOrderTotalsDecimalFraction('12,1234567', 6)).toBe('12,123456');
  });

  it('formatea importes conservando dos decimales mínimos', (): void => {
    expect(formatPurchaseOrderTotalsDecimal(12_000_000, 6, 2)).toBe('12,00');

    expect(formatPurchaseOrderTotalsDecimal(12_345_678, 6, 2)).toBe('12,345678');
  });

  it('usa el cálculo vivo para un pedido pendiente', (): void => {
    expect(
      getPurchaseOrderDisplayedTotalMicros(
        false,
        99_000_000,
        createTotals({
          totalFacturaMicros: 18_930_000,
        }),
      ),
    ).toBe(18_930_000);
  });

  it('usa el importe histórico para un pedido recepcionado', (): void => {
    expect(
      getPurchaseOrderDisplayedTotalMicros(
        true,
        99_000_000,
        createTotals({
          totalFacturaMicros: 18_930_000,
        }),
      ),
    ).toBe(99_000_000);
  });
});
