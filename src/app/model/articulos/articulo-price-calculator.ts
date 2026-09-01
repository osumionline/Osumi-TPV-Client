import type { ArticuloDraft, ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';

const BASIS_POINTS_100_PERCENT: bigint = 10_000n;
const MICRO_PERCENTAGE_100_PERCENT: bigint = 100_000_000n;
const MICROS_PER_CENT: bigint = 10_000n;

/**
 * Centraliza los cálculos fiscales y de precios de una ficha de artículo.
 */
export default class ArticuloPriceCalculator {
  /**
   * Cambia el par fiscal y recalcula PUC y PVP manteniendo
   * Precio albarán y Margen.
   */
  static actualizarFiscalidad(
    draft: ArticuloDraft,
    ivaBps: number,
    reBps: number,
  ): ArticuloDraftPatch {
    this.assertNonNegativeSafeInteger(ivaBps, 'IVA');
    this.assertNonNegativeSafeInteger(reBps, 'RE');

    const pucMicros: number = this.calcularPuc(draft.precioAlbaranMicros, ivaBps, reBps);
    const pvpCents: number = this.calcularPvpDesdeMargen(pucMicros, draft.margenMicroporcentaje);

    return {
      ivaBps,
      reBps,
      pucMicros,
      pvpCents,
    };
  }

  /**
   * Cambia el Precio albarán y recalcula PUC y PVP
   * manteniendo el margen actual.
   */
  static actualizarPrecioAlbaran(
    draft: ArticuloDraft,
    precioAlbaranMicros: number,
  ): ArticuloDraftPatch {
    this.assertNonNegativeSafeInteger(precioAlbaranMicros, 'Precio albarán');

    const fiscalidad = this.requireFiscalidad(draft);
    const pucMicros: number = this.calcularPuc(
      precioAlbaranMicros,
      fiscalidad.ivaBps,
      fiscalidad.reBps,
    );
    const pvpCents: number = this.calcularPvpDesdeMargen(pucMicros, draft.margenMicroporcentaje);

    return {
      precioAlbaranMicros,
      pucMicros,
      pvpCents,
    };
  }

  /**
   * Cambia el PUC, obtiene el Precio albarán inverso
   * y recalcula PVP manteniendo el margen actual.
   */
  static actualizarPuc(draft: ArticuloDraft, pucMicros: number): ArticuloDraftPatch {
    this.assertNonNegativeSafeInteger(pucMicros, 'PUC');

    const fiscalidad = this.requireFiscalidad(draft);
    const precioAlbaranMicros: number = this.calcularPrecioAlbaran(
      pucMicros,
      fiscalidad.ivaBps,
      fiscalidad.reBps,
    );
    const pvpCents: number = this.calcularPvpDesdeMargen(pucMicros, draft.margenMicroporcentaje);

    return {
      precioAlbaranMicros,
      pucMicros,
      pvpCents,
    };
  }

  /**
   * Cambia el PVP y recalcula el margen sobre precio de venta.
   */
  static actualizarPvp(draft: ArticuloDraft, pvpCents: number): ArticuloDraftPatch {
    this.assertNonNegativeSafeInteger(pvpCents, 'PVP');

    return {
      pvpCents,
      margenMicroporcentaje: this.calcularMargen(draft.pucMicros, pvpCents),
    };
  }

  /**
   * Cambia el margen y recalcula el PVP correspondiente.
   */
  static actualizarMargen(draft: ArticuloDraft, margenMicroporcentaje: number): ArticuloDraftPatch {
    this.assertSafeInteger(margenMicroporcentaje, 'Margen');

    return {
      margenMicroporcentaje,
      pvpCents: this.calcularPvpDesdeMargen(draft.pucMicros, margenMicroporcentaje),
    };
  }

  /**
   * Calcula el PUC aplicando IVA y RE al Precio albarán.
   */
  private static calcularPuc(precioAlbaranMicros: number, ivaBps: number, reBps: number): number {
    this.assertNonNegativeSafeInteger(precioAlbaranMicros, 'Precio albarán');

    const factorFiscal: bigint = BASIS_POINTS_100_PERCENT + BigInt(ivaBps) + BigInt(reBps);
    const result: bigint = this.roundDivide(
      BigInt(precioAlbaranMicros) * factorFiscal,
      BASIS_POINTS_100_PERCENT,
    );

    return this.toSafeNumber(result, 'PUC');
  }

  /**
   * Obtiene el Precio albarán eliminando IVA y RE del PUC.
   */
  private static calcularPrecioAlbaran(pucMicros: number, ivaBps: number, reBps: number): number {
    const factorFiscal: bigint = BASIS_POINTS_100_PERCENT + BigInt(ivaBps) + BigInt(reBps);
    const result: bigint = this.roundDivide(
      BigInt(pucMicros) * BASIS_POINTS_100_PERCENT,
      factorFiscal,
    );

    return this.toSafeNumber(result, 'Precio albarán');
  }

  /**
   * Calcula el margen porcentual sobre PVP.
   */
  private static calcularMargen(pucMicros: number, pvpCents: number): number {
    if (pvpCents === 0) {
      return 0;
    }

    const pvpMicros: bigint = BigInt(pvpCents) * MICROS_PER_CENT;
    const diferenciaMicros: bigint = pvpMicros - BigInt(pucMicros);
    const result: bigint = this.roundDivide(
      diferenciaMicros * MICRO_PERCENTAGE_100_PERCENT,
      pvpMicros,
    );

    return this.toSafeNumber(result, 'Margen');
  }

  /**
   * Calcula el PVP necesario para conservar un margen determinado.
   */
  private static calcularPvpDesdeMargen(pucMicros: number, margenMicroporcentaje: number): number {
    this.assertNonNegativeSafeInteger(pucMicros, 'PUC');
    this.assertSafeInteger(margenMicroporcentaje, 'Margen');

    const margen: bigint = BigInt(margenMicroporcentaje);

    if (margen >= MICRO_PERCENTAGE_100_PERCENT) {
      throw new Error('El margen debe ser inferior al 100 % para calcular el PVP.');
    }

    const divisorMargen: bigint = MICRO_PERCENTAGE_100_PERCENT - margen;
    const result: bigint = this.roundDivide(
      BigInt(pucMicros) * MICRO_PERCENTAGE_100_PERCENT,
      divisorMargen * MICROS_PER_CENT,
    );

    return this.toSafeNumber(result, 'PVP');
  }

  /**
   * Obtiene IVA y RE de un draft que ya tiene fiscalidad seleccionada.
   */
  private static requireFiscalidad(draft: ArticuloDraft): {
    readonly ivaBps: number;
    readonly reBps: number;
  } {
    if (draft.ivaBps === null || draft.reBps === null) {
      throw new Error('Es necesario seleccionar la fiscalidad antes de calcular precios.');
    }

    this.assertNonNegativeSafeInteger(draft.ivaBps, 'IVA');
    this.assertNonNegativeSafeInteger(draft.reBps, 'RE');

    return {
      ivaBps: draft.ivaBps,
      reBps: draft.reBps,
    };
  }

  /**
   * Divide dos enteros aplicando redondeo al entero más próximo,
   * simétrico también para resultados negativos.
   */
  private static roundDivide(numerator: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) {
      throw new Error('El divisor de un cálculo de precios debe ser mayor que cero.');
    }

    const negative: boolean = numerator < 0n;
    const absoluteNumerator: bigint = negative ? -numerator : numerator;
    const rounded: bigint = (absoluteNumerator + denominator / 2n) / denominator;

    return negative ? -rounded : rounded;
  }

  /**
   * Comprueba que un valor es un entero seguro.
   */
  private static assertSafeInteger(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`El valor de ${fieldName} debe ser un entero seguro.`);
    }
  }

  /**
   * Comprueba que un valor es un entero seguro no negativo.
   */
  private static assertNonNegativeSafeInteger(value: number, fieldName: string): void {
    this.assertSafeInteger(value, fieldName);

    if (value < 0) {
      throw new Error(`El valor de ${fieldName} no puede ser negativo.`);
    }
  }

  /**
   * Convierte el resultado BigInt a number garantizando
   * que permanece dentro del rango entero seguro.
   */
  private static toSafeNumber(value: bigint, fieldName: string): number {
    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(`El valor calculado de ${fieldName} supera el rango seguro de enteros.`);
    }

    return result;
  }
}
