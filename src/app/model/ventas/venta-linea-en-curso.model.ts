import { BASIS_POINTS_TOTAL } from '@model/ventas/ventas-money.constants';

/**
 * Representa una línea real de una venta que todavía no ha sido finalizada.
 */
export default class VentaLineaEnCurso {
  readonly idTemporal: string = crypto.randomUUID();

  idArticulo: number | null = null;
  articuloPublicId: string | null = null;
  localizador: number | null = null;
  descripcion: string = '';
  marca: string = '';
  stock: number | null = null;
  cantidad: number = 1;

  pucMicros: number = 0;
  pvpMicros: number = 0;
  importeManualMicros: number | null = null;
  descuentoBps: number = 0;
  descuentoDirectoMicros: number | null = null;

  ivaBps: number = 0;
  observaciones: string | null = null;
  regalo: boolean = false;

  /**
   * Obtiene el importe de la línea antes de aplicar descuentos o modificaciones manuales.
   */
  get importeBaseMicros(): number {
    return this.cantidad * this.pvpMicros;
  }

  /**
   * Obtiene el importe descontado a la línea.
   */
  get importeDescuentoMicros(): number {
    if (this.regalo || this.importeManualMicros !== null) {
      return 0;
    }

    if (this.descuentoDirectoMicros !== null) {
      return this.descuentoDirectoMicros;
    }

    const descuentoMicros: number = this.importeBaseMicros * this.descuentoBps;

    return this.roundDivision(descuentoMicros, BASIS_POINTS_TOTAL);
  }

  /**
   * Obtiene el importe final de la línea en microeuros.
   */
  get importeFinalMicros(): number {
    if (this.regalo) {
      return 0;
    }

    if (this.importeManualMicros !== null) {
      return this.importeManualMicros;
    }

    return this.importeBaseMicros - this.importeDescuentoMicros;
  }

  /**
   * Redondea una división de enteros de forma simétrica para valores positivos y negativos.
   */
  private roundDivision(value: number, divisor: number): number {
    const sign: number = value < 0 ? -1 : 1;

    return sign * Math.round(Math.abs(value) / divisor);
  }
}
