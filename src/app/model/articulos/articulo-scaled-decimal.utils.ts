/**
 * Convierte un decimal escrito por el usuario a un entero escalado.
 *
 * Admite coma o punto decimal y redondea cuando existen más
 * decimales que los soportados por la escala.
 */
export function parseScaledDecimal(value: string, scaleDigits: number): number | null {
  assertScaleDigits(scaleDigits);

  const normalizedValue: string = value.trim();
  const match: RegExpMatchArray | null = normalizedValue.match(
    /^([+-]?)(?:(\d+)(?:[.,](\d*))?|[.,](\d+))$/,
  );

  if (match === null) {
    return null;
  }

  const negative: boolean = match[1] === '-';
  const integerPart: string = match[2] ?? '0';
  const fractionPart: string = match[3] ?? match[4] ?? '';
  const scale: bigint = 10n ** BigInt(scaleDigits);
  const keptFraction: string = fractionPart.slice(0, scaleDigits).padEnd(scaleDigits, '0');
  const fractionValue: bigint = keptFraction === '' ? 0n : BigInt(keptFraction);

  let absoluteValue: bigint = BigInt(integerPart) * scale + fractionValue;

  if (fractionPart.length > scaleDigits && Number(fractionPart[scaleDigits]) >= 5) {
    absoluteValue += 1n;
  }

  const scaledValue: bigint = negative ? -absoluteValue : absoluteValue;
  const result: number = Number(scaledValue);

  return Number.isSafeInteger(result) ? result : null;
}

/**
 * Indica si un decimal se encuentra todavía en un estado
 * intermedio válido mientras el usuario está escribiendo.
 */
export function isTransientScaledDecimalInput(value: string): boolean {
  const normalizedValue: string = value.trim();

  return (
    normalizedValue === '' ||
    normalizedValue === '+' ||
    normalizedValue === '-' ||
    normalizedValue.endsWith(',') ||
    normalizedValue.endsWith('.')
  );
}

/**
 * Convierte un número de configuración a un entero escalado
 * utilizando su representación decimal.
 */
export function numberToScaledInteger(value: number, scaleDigits: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return parseScaledDecimal(String(value), scaleDigits);
}

/**
 * Formatea un entero escalado como decimal legible con coma.
 */
export function formatScaledDecimal(
  value: number,
  scaleDigits: number,
  minFractionDigits: number = 0,
): string {
  assertScaleDigits(scaleDigits);

  if (
    !Number.isInteger(minFractionDigits) ||
    minFractionDigits < 0 ||
    minFractionDigits > scaleDigits
  ) {
    throw new Error('El número mínimo de decimales debe ser válido para la escala.');
  }

  if (!Number.isSafeInteger(value)) {
    throw new Error('El valor a formatear debe ser un entero seguro.');
  }

  const negative: boolean = value < 0;
  const absoluteValue: bigint = BigInt(negative ? -value : value);
  const scale: bigint = 10n ** BigInt(scaleDigits);
  const integerPart: bigint = absoluteValue / scale;

  if (scaleDigits === 0) {
    return `${negative ? '-' : ''}${integerPart}`;
  }

  let fractionPart: string = (absoluteValue % scale).toString().padStart(scaleDigits, '0');

  while (fractionPart.length > minFractionDigits && fractionPart.endsWith('0')) {
    fractionPart = fractionPart.slice(0, -1);
  }

  const sign: string = negative ? '-' : '';

  if (fractionPart === '') {
    return `${sign}${integerPart}`;
  }

  return `${sign}${integerPart},${fractionPart}`;
}

/**
 * Valida una precisión decimal utilizada por las utilidades escaladas.
 */
function assertScaleDigits(scaleDigits: number): void {
  if (!Number.isInteger(scaleDigits) || scaleDigits < 0 || scaleDigits > 12) {
    throw new Error('La escala decimal debe ser un entero entre 0 y 12.');
  }
}
