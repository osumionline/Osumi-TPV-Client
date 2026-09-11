import resolveLegacyPurchasePaymentMethod from '@infrastructure/legacy-import/legacy-import-purchase-data.importer.private';
import { describe, expect, it } from 'vitest';

describe('resolveLegacyPurchasePaymentMethod', (): void => {
  it('conserva la correspondencia histórica exacta de Compras', (): void => {
    expect(resolveLegacyPurchasePaymentMethod(0)).toBe('Domiciliación bancaria');
    expect(resolveLegacyPurchasePaymentMethod(1)).toBe('Tarjeta');
    expect(resolveLegacyPurchasePaymentMethod(2)).toBe('Paypal');
    expect(resolveLegacyPurchasePaymentMethod(3)).toBe('Al contado');
    expect(resolveLegacyPurchasePaymentMethod(4)).toBe('Transferencia bancaria');
  });

  it('devuelve null para valores ausentes o desconocidos', (): void => {
    expect(resolveLegacyPurchasePaymentMethod(null)).toBeNull();
    expect(resolveLegacyPurchasePaymentMethod(-1)).toBeNull();
    expect(resolveLegacyPurchasePaymentMethod(5)).toBeNull();
  });
});
