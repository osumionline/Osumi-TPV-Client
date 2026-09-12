import {
  formatPurchaseOrderLineDecimal,
  isPurchaseOrderLineTransientDecimal,
  limitPurchaseOrderLineDecimalFraction,
  parsePurchaseOrderLineDecimal,
} from '@modules/compras/pedidos/components/purchase-order-lines/purchase-order-lines.component.private';
import { describe, expect, it } from 'vitest';

describe('purchase-order-lines.component.private', (): void => {
  it('convierte importes con coma a microeuros', (): void => {
    expect(parsePurchaseOrderLineDecimal('12,345678', 6)).toBe(12_345_678);
  });

  it('acepta punto decimal y valores inferiores a uno', (): void => {
    expect(parsePurchaseOrderLineDecimal('.5', 6)).toBe(500_000);

    expect(parsePurchaseOrderLineDecimal('5.25', 2)).toBe(525);
  });

  it('rechaza texto y exceso de precisión', (): void => {
    expect(parsePurchaseOrderLineDecimal('abc', 6)).toBeNull();

    expect(parsePurchaseOrderLineDecimal('1,1234567', 6)).toBeNull();
  });

  it('identifica estados decimales transitorios', (): void => {
    expect(isPurchaseOrderLineTransientDecimal('')).toBe(true);

    expect(isPurchaseOrderLineTransientDecimal('12,')).toBe(true);

    expect(isPurchaseOrderLineTransientDecimal('12,3')).toBe(false);
  });

  it('limita únicamente la parte decimal', (): void => {
    expect(limitPurchaseOrderLineDecimalFraction('12,3456789', 6)).toBe('12,345678');
  });

  it('formatea microeuros conservando al menos dos decimales', (): void => {
    expect(formatPurchaseOrderLineDecimal(12_340_000, 6, 2)).toBe('12,34');

    expect(formatPurchaseOrderLineDecimal(12_000_000, 6, 2)).toBe('12,00');

    expect(formatPurchaseOrderLineDecimal(12_345_678, 6, 2)).toBe('12,345678');
  });
});
