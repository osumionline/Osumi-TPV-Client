import { BASIS_POINTS_PER_PERCENT } from '@backend/constants/percentage.constants';

/**
 * Convierte un porcentaje a puntos básicos.
 *
 * El rango permitido pertenece al dominio
 * que utilice el porcentaje.
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
 * El rango permitido pertenece al dominio
 * consumidor.
 */
export function bpsToPercent(bps: number): number {
  if (!Number.isSafeInteger(bps)) {
    throw new RangeError('Los puntos básicos no son válidos.');
  }

  return bps / BASIS_POINTS_PER_PERCENT;
}
