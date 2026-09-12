export type PurchaseOrderLineDecimalField = 'palb' | 'descuento' | 'pvp';

/**
 * Limita la parte decimal visible sin interferir
 * con estados intermedios de edición.
 */
export function limitPurchaseOrderLineDecimalFraction(
  value: string,
  maxFractionDigits: number,
): string {
  const match: RegExpMatchArray | null = value.match(/^(\d*)([.,])(\d*)$/);

  if (match === null || match[3].length <= maxFractionDigits) {
    return value;
  }

  return `${match[1]}${match[2]}` + match[3].slice(0, maxFractionDigits);
}

/**
 * Indica si el texto representa un estado temporal
 * todavía incompleto mientras el usuario escribe.
 */
export function isPurchaseOrderLineTransientDecimal(value: string): boolean {
  const trimmedValue: string = value.trim();

  return trimmedValue.length === 0 || /^[.,]$/.test(trimmedValue) || /^\d+[.,]$/.test(trimmedValue);
}

/**
 * Convierte un decimal escrito con coma o punto
 * al entero escalado utilizado internamente.
 */
export function parsePurchaseOrderLineDecimal(value: string, scale: number): number | null {
  const trimmedValue: string = value.trim();

  if (
    !Number.isSafeInteger(scale) ||
    scale < 0 ||
    !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmedValue)
  ) {
    return null;
  }

  const normalizedValue: string = trimmedValue.replace(',', '.');

  const [rawIntegerPart, rawFractionPart = ''] = normalizedValue.split('.');

  if (rawFractionPart.length > scale) {
    return null;
  }

  const integerPart: string = rawIntegerPart.length === 0 ? '0' : rawIntegerPart;

  const fractionPart: string = rawFractionPart.padEnd(scale, '0');

  const factor: bigint = 10n ** BigInt(scale);

  const scaledValue: bigint =
    BigInt(integerPart) * factor + BigInt(fractionPart.length === 0 ? '0' : fractionPart);

  if (scaledValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(scaledValue);
}

/**
 * Formatea un entero escalado con coma decimal,
 * eliminando ceros sobrantes hasta el mínimo indicado.
 */
export function formatPurchaseOrderLineDecimal(
  value: number,
  scale: number,
  minFractionDigits: number,
): string {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    !Number.isSafeInteger(scale) ||
    scale < 0 ||
    minFractionDigits < 0 ||
    minFractionDigits > scale
  ) {
    return '';
  }

  if (scale === 0) {
    return String(value);
  }

  const paddedValue: string = String(value).padStart(scale + 1, '0');

  const integerPart: string = paddedValue.slice(0, -scale);

  let fractionPart: string = paddedValue.slice(-scale);

  while (fractionPart.length > minFractionDigits && fractionPart.endsWith('0')) {
    fractionPart = fractionPart.slice(0, -1);
  }

  return fractionPart.length === 0 ? integerPart : `${integerPart},${fractionPart}`;
}
