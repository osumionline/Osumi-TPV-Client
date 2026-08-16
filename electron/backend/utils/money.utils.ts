import { MICROS_PER_CENT } from '@backend/constants/money.constants';

/**
 * Convierte céntimos a microeuros.
 *
 * Admite valores positivos, cero y negativos.
 */
export function centsToMicros(cents: number): number {
  requireSafeInteger(cents, 'La cantidad de céntimos no es válida.');

  const micros: number = cents * MICROS_PER_CENT;

  requireSafeInteger(
    micros,
    'La conversión de céntimos a microeuros supera el rango numérico seguro.',
  );

  return micros;
}

/**
 * Convierte microeuros a céntimos utilizando
 * redondeo simétrico para valores positivos
 * y negativos.
 */
export function microsToCents(micros: number): number {
  requireSafeInteger(micros, 'La cantidad de microeuros no es válida.');

  return roundIntegerDivision(micros, MICROS_PER_CENT);
}

/**
 * Divide dos enteros aplicando el mismo criterio
 * de redondeo a valores positivos y negativos.
 */
function roundIntegerDivision(value: number, divisor: number): number {
  requireSafeInteger(value, 'El valor a dividir no es válido.');

  if (!Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new RangeError('El divisor debe ser un entero mayor que cero.');
  }

  const sign: number = value < 0 ? -1 : 1;

  return sign * Math.round(Math.abs(value) / divisor);
}

/**
 * Comprueba que un valor pueda utilizarse
 * de forma segura en cálculos enteros.
 */
function requireSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(message);
  }
}
