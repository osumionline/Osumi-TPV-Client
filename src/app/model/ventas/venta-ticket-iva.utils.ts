import { BASIS_POINTS_TOTAL } from '@constants/percentage.constants';
import type { VentaTicketLineaInterface } from '@desktop-contracts/ventas/venta-ticket.interface';

export interface VentaTicketIvaResumen {
  readonly ivaBps: number;
  readonly importeMicros: number;
  readonly baseMicros: number;
  readonly cuotaMicros: number;
}

/**
 * Construye el desglose de IVA de un ticket a partir
 * de los importes finales realmente persistidos.
 *
 * Los importes mantienen su signo. Esto es importante
 * porque una operación puede mezclar compras y devoluciones.
 */
export function buildVentaTicketIvaResumen(
  lineas: readonly VentaTicketLineaInterface[],
): readonly VentaTicketIvaResumen[] {
  const importePorIva: Map<number, number> = new Map<number, number>();

  for (const linea of lineas) {
    requireValidIvaBps(linea.ivaBps);
    requireSafeInteger(linea.importeMicros, 'El importe de una línea del ticket no es válido.');

    const importeAnterior: number = importePorIva.get(linea.ivaBps) ?? 0;
    const importeMicros: number = importeAnterior + linea.importeMicros;

    requireSafeInteger(importeMicros, 'El acumulado de IVA supera el rango numérico seguro.');

    importePorIva.set(linea.ivaBps, importeMicros);
  }

  return [...importePorIva.entries()]
    .filter(([, importeMicros]: readonly [number, number]): boolean => importeMicros !== 0)
    .sort(
      ([ivaBpsA]: readonly [number, number], [ivaBpsB]: readonly [number, number]): number =>
        ivaBpsB - ivaBpsA,
    )
    .map(([ivaBps, importeMicros]: readonly [number, number]): VentaTicketIvaResumen => {
      const baseMicros: number = calculateTaxBaseMicros(importeMicros, ivaBps);
      const cuotaMicros: number = importeMicros - baseMicros;

      requireSafeInteger(cuotaMicros, 'La cuota de IVA supera el rango numérico seguro.');

      return {
        ivaBps,
        importeMicros,
        baseMicros,
        cuotaMicros,
      };
    });
}

function calculateTaxBaseMicros(importeMicros: number, ivaBps: number): number {
  if (importeMicros === 0 || ivaBps === 0) {
    return importeMicros;
  }

  const divisor: number = BASIS_POINTS_TOTAL + ivaBps;
  const sign: number = importeMicros < 0 ? -1 : 1;

  const baseMicros: number =
    sign * Math.round((Math.abs(importeMicros) / divisor) * BASIS_POINTS_TOTAL);

  requireSafeInteger(baseMicros, 'La base imponible supera el rango numérico seguro.');

  return baseMicros;
}

function requireValidIvaBps(ivaBps: number): void {
  if (!Number.isSafeInteger(ivaBps) || ivaBps < 0 || ivaBps > BASIS_POINTS_TOTAL) {
    throw new RangeError('El IVA de una línea del ticket no es válido.');
  }
}

function requireSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(message);
  }
}
