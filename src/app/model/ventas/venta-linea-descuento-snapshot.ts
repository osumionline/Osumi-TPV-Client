import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';

export interface VentaLineaDescuentoSnapshot {
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
}

/**
 * Obtiene la representación histórica del descuento efectivo
 * de una línea ordinaria de venta.
 *
 * - porcentaje → descuentoBps
 * - promoción/directo/manual/regalo → importe fijo
 *
 * Las líneas procedentes de reservas o devoluciones conservan
 * una economía histórica propia y deben tratarse por separado.
 */
export function getVentaLineaDescuentoSnapshot(
  linea: VentaLineaEnCurso,
): VentaLineaDescuentoSnapshot {
  if (linea.esDevolucion || linea.esReserva) {
    throw new Error('El descuento de una línea histórica debe obtenerse desde su origen.');
  }

  if (linea.regalo) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.importeBaseMicros,
    };
  }

  if (linea.importeManualMicros !== null) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: Math.max(linea.importeBaseMicros - linea.importeFinalMicros, 0),
    };
  }

  if (linea.tieneDescuentoPromocional) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.importeDescuentoPromocionalMicros,
    };
  }

  if (linea.descuentoDirectoMicros !== null) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.descuentoDirectoMicros,
    };
  }

  return {
    descuentoBps: linea.descuentoBps,
    importeDescuentoMicros: 0,
  };
}
