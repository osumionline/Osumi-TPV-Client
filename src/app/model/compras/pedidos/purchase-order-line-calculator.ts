import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';

const BASIS_POINTS_100_PERCENT: bigint = 10_000n;
const MICRO_PERCENTAGE_100_PERCENT: bigint = 100_000_000n;

/**
 * Centraliza los cálculos económicos propios
 * de una línea editable de Pedido.
 */
export default class PurchaseOrderLineCalculator {
  /**
   * Cambia el Precio albarán y recalcula
   * PUC y Margen manteniendo el PVP.
   */
  static actualizarPrecioAlbaran(
    line: PurchaseOrderLineState,
    palbMicros: number,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderLineState {
    this.assertNonNegativeSafeInteger(palbMicros, 'Precio albarán');

    return this.recalcularCostes(
      {
        ...line,
        palbMicros,
      },
      aplicarRecargoEquivalencia,
    );
  }

  /**
   * Cambia el descuento de línea y recalcula
   * PUC y Margen manteniendo el PVP.
   */
  static actualizarDescuento(
    line: PurchaseOrderLineState,
    descuentoBps: number,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderLineState {
    this.assertNonNegativeSafeInteger(descuentoBps, 'Descuento');

    if (descuentoBps > Number(BASIS_POINTS_100_PERCENT)) {
      throw new Error('El descuento debe estar entre 0 % y 100 %.');
    }

    return this.recalcularCostes(
      {
        ...line,
        descuentoBps,
      },
      aplicarRecargoEquivalencia,
    );
  }

  /**
   * Cambia conjuntamente el par IVA/RE y recalcula
   * PUC y Margen según el R.E. del Pedido.
   */
  static actualizarFiscalidad(
    line: PurchaseOrderLineState,
    ivaBps: number,
    recargoEquivalenciaBps: number,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderLineState {
    this.assertNonNegativeSafeInteger(ivaBps, 'IVA');

    this.assertNonNegativeSafeInteger(recargoEquivalenciaBps, 'RE');

    return this.recalcularCostes(
      {
        ...line,
        ivaBps,
        recargoEquivalenciaBps,
      },
      aplicarRecargoEquivalencia,
    );
  }

  /**
   * Cambia el PVP y recalcula exclusivamente
   * el Margen de la línea.
   */
  static actualizarPvp(line: PurchaseOrderLineState, pvpMicros: number): PurchaseOrderLineState {
    this.assertNonNegativeSafeInteger(pvpMicros, 'PVP');

    return {
      ...line,
      pvpMicros,
      margenMicroporcentaje: this.calcularMargen(line.pucMicros, pvpMicros),
    };
  }

  /**
   * Recalcula una línea cuando cambia el uso global
   * de Recargo de Equivalencia del Pedido.
   */
  static recalcularPorRecargoEquivalencia(
    line: PurchaseOrderLineState,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderLineState {
    return this.recalcularCostes(line, aplicarRecargoEquivalencia);
  }

  /**
   * Calcula el Total de línea como
   * Unidades × PUC conservando microeuros.
   */
  static calcularTotalMicros(line: PurchaseOrderLineState): number {
    this.assertNonNegativeSafeInteger(line.unidades, 'Unidades');

    this.assertNonNegativeSafeInteger(line.pucMicros, 'PUC');

    return this.toSafeNumber(BigInt(line.unidades) * BigInt(line.pucMicros), 'Total de línea');
  }

  /**
   * Recalcula PUC y Margen partiendo del estado
   * económico actual de la línea.
   */
  private static recalcularCostes(
    line: PurchaseOrderLineState,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderLineState {
    const pucMicros: number = this.calcularPuc(
      line.palbMicros,
      line.descuentoBps,
      line.ivaBps,
      aplicarRecargoEquivalencia ? line.recargoEquivalenciaBps : 0,
    );

    return {
      ...line,
      pucMicros,
      margenMicroporcentaje: this.calcularMargen(pucMicros, line.pvpMicros),
    };
  }

  /**
   * Calcula el PUC a partir del Precio albarán,
   * descuento de línea e impuestos efectivos.
   */
  private static calcularPuc(
    palbMicros: number,
    descuentoBps: number,
    ivaBps: number,
    recargoEquivalenciaBps: number,
  ): number {
    this.assertNonNegativeSafeInteger(palbMicros, 'Precio albarán');

    this.assertNonNegativeSafeInteger(descuentoBps, 'Descuento');

    this.assertNonNegativeSafeInteger(ivaBps, 'IVA');

    this.assertNonNegativeSafeInteger(recargoEquivalenciaBps, 'RE');

    if (descuentoBps > Number(BASIS_POINTS_100_PERCENT)) {
      throw new Error('El descuento debe estar entre 0 % y 100 %.');
    }

    const factorDescuento: bigint = BASIS_POINTS_100_PERCENT - BigInt(descuentoBps);

    const factorFiscal: bigint =
      BASIS_POINTS_100_PERCENT + BigInt(ivaBps) + BigInt(recargoEquivalenciaBps);

    const result: bigint = this.roundDivide(
      BigInt(palbMicros) * factorDescuento * factorFiscal,
      BASIS_POINTS_100_PERCENT * BASIS_POINTS_100_PERCENT,
    );

    return this.toSafeNumber(result, 'PUC');
  }

  /**
   * Calcula el margen porcentual sobre PVP.
   */
  private static calcularMargen(pucMicros: number, pvpMicros: number): number {
    this.assertNonNegativeSafeInteger(pucMicros, 'PUC');

    this.assertNonNegativeSafeInteger(pvpMicros, 'PVP');

    if (pvpMicros === 0) {
      return 0;
    }

    const result: bigint = this.roundDivide(
      (BigInt(pvpMicros) - BigInt(pucMicros)) * MICRO_PERCENTAGE_100_PERCENT,
      BigInt(pvpMicros),
    );

    return this.toSafeNumber(result, 'Margen');
  }

  /**
   * Divide dos enteros aplicando redondeo simétrico
   * al entero más próximo.
   */
  private static roundDivide(numerator: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) {
      throw new Error('El divisor de un cálculo económico debe ser mayor que cero.');
    }

    const negative: boolean = numerator < 0n;

    const absoluteNumerator: bigint = negative ? -numerator : numerator;

    const rounded: bigint = (absoluteNumerator + denominator / 2n) / denominator;

    return negative ? -rounded : rounded;
  }

  /**
   * Comprueba que un valor es un entero seguro
   * y no negativo.
   */
  private static assertNonNegativeSafeInteger(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`El valor de ${fieldName} debe ser un entero seguro.`);
    }

    if (value < 0) {
      throw new Error(`El valor de ${fieldName} no puede ser negativo.`);
    }
  }

  /**
   * Convierte un BigInt a number garantizando
   * que permanece dentro del rango seguro.
   */
  private static toSafeNumber(value: bigint, fieldName: string): number {
    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(`El valor calculado de ${fieldName} supera el rango seguro de enteros.`);
    }

    return result;
  }
}
