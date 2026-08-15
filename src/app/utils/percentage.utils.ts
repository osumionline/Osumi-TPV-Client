import { BASIS_POINTS_PER_PERCENT } from '@constants/percentage.constants';

/**
 * Convierte un porcentaje a puntos básicos.
 *
 * No valida el rango 0–100 porque ese límite
 * pertenece al dominio que utiliza el valor.
 */
export function percentToBps(percent: number): number {
  if (!Number.isFinite(percent)) {
    throw new RangeError('El porcentaje no es válido.');
  }

  const bps: number = Math.round(percent * BASIS_POINTS_PER_PERCENT);

  if (!Number.isSafeInteger(bps)) {
    throw new RangeError(
      'La conversión del porcentaje a puntos básicos supera el rango numérico seguro.',
    );
  }

  return bps;
}

/**
 * Convierte puntos básicos a porcentaje.
 *
 * No valida el rango 0–10.000 porque el rango
 * permitido pertenece al dominio consumidor.
 */
export function bpsToPercent(bps: number): number {
  if (!Number.isSafeInteger(bps)) {
    throw new RangeError('Los puntos básicos no son válidos.');
  }

  return bps / BASIS_POINTS_PER_PERCENT;
}
