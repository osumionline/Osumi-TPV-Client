const LEGACY_PURCHASE_PAYMENT_METHODS: readonly string[] = [
  'Domiciliación bancaria',
  'Tarjeta',
  'Paypal',
  'Al contado',
  'Transferencia bancaria',
];

/**
 * Convierte el índice legacy de forma de pago
 * en su snapshot textual original.
 */
export default function resolveLegacyPurchasePaymentMethod(
  paymentMethod: number | null,
): string | null {
  if (
    paymentMethod === null ||
    !Number.isSafeInteger(paymentMethod) ||
    paymentMethod < 0 ||
    paymentMethod >= LEGACY_PURCHASE_PAYMENT_METHODS.length
  ) {
    return null;
  }

  return LEGACY_PURCHASE_PAYMENT_METHODS[paymentMethod] ?? null;
}
