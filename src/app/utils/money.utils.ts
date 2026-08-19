import { CENTS_PER_EURO, MICROS_PER_CENT, MICROS_PER_EURO } from '@constants/money.constants';
import { BASIS_POINTS_TOTAL } from '@constants/percentage.constants';

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
 * Convierte céntimos a euros.
 *
 * No realiza ningún redondeo adicional:
 * se utiliza principalmente para presentación.
 */
export function centsToEuros(cents: number): number {
  requireSafeInteger(cents, 'La cantidad de céntimos no es válida.');

  return cents / CENTS_PER_EURO;
}

/**
 * Convierte una cantidad expresada en euros a
 * céntimos utilizando redondeo simétrico.
 *
 * Es la convención utilizada para cantidades
 * monetarias introducidas por el usuario cuyo
 * dominio trabaja directamente en céntimos.
 */
export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros)) {
    throw new RangeError('La cantidad de euros no es válida.');
  }

  const sign: number = euros < 0 ? -1 : 1;

  const cents: number = sign * Math.round(Math.abs(euros) * CENTS_PER_EURO);

  requireSafeInteger(cents, 'La conversión de euros a céntimos supera el rango numérico seguro.');

  return cents;
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
 * Convierte microeuros a euros.
 *
 * No realiza ningún redondeo adicional:
 * se utiliza principalmente para presentación.
 */
export function microsToEuros(micros: number): number {
  requireSafeInteger(micros, 'La cantidad de microeuros no es válida.');

  return micros / MICROS_PER_EURO;
}

/**
 * Convierte una cantidad expresada en euros a
 * microeuros redondeando primero a céntimos.
 *
 * Es la convención utilizada para cualquier
 * cantidad monetaria introducida por el usuario.
 */
export function eurosToMicros(euros: number): number {
  return centsToMicros(eurosToCents(euros));
}

/**
 * Calcula el importe correspondiente a un porcentaje
 * expresado en puntos básicos.
 *
 * El resultado se redondea simétricamente al
 * microeuro entero más próximo.
 */
export function calculateBpsAmountMicros(importeMicros: number, bps: number): number {
  requireSafeInteger(importeMicros, 'El importe en microeuros no es válido.');

  requireSafeInteger(bps, 'Los puntos básicos no son válidos.');

  const product: number = importeMicros * bps;

  requireSafeInteger(product, 'El cálculo porcentual supera el rango numérico seguro.');

  return roundIntegerDivision(product, BASIS_POINTS_TOTAL);
}

/**
 * Calcula la parte proporcional de un importe
 * correspondiente a unas unidades concretas.
 *
 * Las unidades pueden superar las unidades totales.
 * Esto es necesario, por ejemplo, cuando finalmente
 * se venden más unidades de las que se habían reservado.
 */
export function calculateProportionalMicros(
  importeMicros: number,
  unidades: number,
  unidadesTotales: number,
): number {
  requireSafeInteger(importeMicros, 'El importe en microeuros no es válido.');

  if (!Number.isSafeInteger(unidades) || unidades < 0) {
    throw new RangeError('Las unidades deben ser un entero mayor o igual que cero.');
  }

  if (!Number.isSafeInteger(unidadesTotales) || unidadesTotales <= 0) {
    throw new RangeError('Las unidades totales deben ser un entero mayor que cero.');
  }

  if (unidades === 0) {
    return 0;
  }

  const product: number = importeMicros * unidades;

  requireSafeInteger(product, 'El cálculo proporcional supera el rango numérico seguro.');

  return roundIntegerDivision(product, unidadesTotales);
}

/**
 * Divide dos enteros utilizando el mismo criterio
 * de redondeo para números positivos y negativos.
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
