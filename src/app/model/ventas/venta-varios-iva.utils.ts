import { PERCENT_TOTAL } from '@constants/percentage.constants';
import { percentToBps } from '@utils/percentage.utils';

const DEFAULT_IVA_BPS: number = 2_100;

/**
 * Convierte la configuración porcentual de IVA a puntos básicos.
 */
export function getVariosIvaOptionsBps(ivaList: readonly number[]): readonly number[] {
  return ivaList.map((iva: number): number => {
    if (!Number.isFinite(iva) || iva < 0 || iva > PERCENT_TOTAL) {
      throw new RangeError('La configuración de IVA contiene un valor no válido.');
    }

    return percentToBps(iva);
  });
}

/**
 * Obtiene el IVA inicial para una línea Varios.
 *
 * Se utiliza el 21 % siempre que esté configurado. Si no existe,
 * se utiliza el tipo de IVA más alto disponible.
 */
export function getDefaultVariosIvaBps(ivaList: readonly number[]): number {
  const ivaOptionsBps: readonly number[] = getVariosIvaOptionsBps(ivaList);

  if (ivaOptionsBps.length === 0) {
    throw new Error('No hay ningún tipo de IVA configurado.');
  }

  if (ivaOptionsBps.includes(DEFAULT_IVA_BPS)) {
    return DEFAULT_IVA_BPS;
  }

  return Math.max(...ivaOptionsBps);
}
