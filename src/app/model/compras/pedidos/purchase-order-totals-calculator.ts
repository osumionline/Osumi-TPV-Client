import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import type {
  PurchaseOrderTaxBreakdown,
  PurchaseOrderTotals,
} from '@model/compras/pedidos/purchase-order-totals.interface';

const BASIS_POINTS_100_PERCENT: bigint = 10_000n;
const BASE_FACTOR_DENOMINATOR: bigint = BASIS_POINTS_100_PERCENT * BASIS_POINTS_100_PERCENT;

const MICRO_PERCENTAGE_100_PERCENT: bigint = 100_000_000n;

const PORTES_IVA_BPS: number = 2100;
const PORTES_RE_BPS: number = 520;

interface TaxAccumulator {
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
  baseNumerator: bigint;
}

/**
 * Centraliza los cálculos económicos globales
 * de un Pedido.
 */
export default class PurchaseOrderTotalsCalculator {
  /**
   * Calcula todos los totales económicos del Pedido
   * sin modificar el estado de sus líneas.
   */
  static calcular(
    lines: readonly PurchaseOrderLineState[],
    portesMicros: number,
    descuentoGlobalBps: number,
    aplicarRecargoEquivalencia: boolean,
  ): PurchaseOrderTotals {
    this.assertNonNegativeSafeInteger(portesMicros, 'Portes');

    this.assertPercentage(descuentoGlobalBps, 'Descuento global');

    let totalArticulos: bigint = 0n;
    let totalBeneficiosMicros: bigint = 0n;
    let totalPvpMicros: bigint = 0n;
    let totalPucMicros: bigint = 0n;

    const taxGroups: Map<string, TaxAccumulator> = new Map<string, TaxAccumulator>();

    for (const line of lines) {
      this.validateLine(line);

      const unidades: bigint = BigInt(line.unidades);

      totalArticulos += unidades;

      totalPvpMicros += unidades * BigInt(line.pvpMicros);

      totalPucMicros += unidades * BigInt(line.pucMicros);

      totalBeneficiosMicros += unidades * (BigInt(line.pvpMicros) - BigInt(line.pucMicros));

      const lineDiscountFactor: bigint = BASIS_POINTS_100_PERCENT - BigInt(line.descuentoBps);

      const globalDiscountFactor: bigint = BASIS_POINTS_100_PERCENT - BigInt(descuentoGlobalBps);

      const baseNumerator: bigint =
        unidades * BigInt(line.palbMicros) * lineDiscountFactor * globalDiscountFactor;

      this.addTaxBase(
        taxGroups,
        line.ivaBps,
        aplicarRecargoEquivalencia ? line.recargoEquivalenciaBps : 0,
        baseNumerator,
      );
    }

    if (portesMicros > 0) {
      this.addTaxBase(
        taxGroups,
        PORTES_IVA_BPS,
        aplicarRecargoEquivalencia ? PORTES_RE_BPS : 0,
        BigInt(portesMicros) * BASE_FACTOR_DENOMINATOR,
      );
    }

    const desgloseFiscal: readonly PurchaseOrderTaxBreakdown[] = this.buildTaxBreakdown(taxGroups);

    const subtotalMicros: bigint = desgloseFiscal.reduce(
      (total: bigint, row: PurchaseOrderTaxBreakdown): bigint => total + BigInt(row.baseMicros),
      0n,
    );

    const ivaMicros: bigint = desgloseFiscal.reduce(
      (total: bigint, row: PurchaseOrderTaxBreakdown): bigint => total + BigInt(row.ivaMicros),
      0n,
    );

    const recargoEquivalenciaMicros: bigint = desgloseFiscal.reduce(
      (total: bigint, row: PurchaseOrderTaxBreakdown): bigint =>
        total + BigInt(row.recargoEquivalenciaMicros),
      0n,
    );

    const totalFacturaMicros: bigint = subtotalMicros + ivaMicros + recargoEquivalenciaMicros;

    const totalPucConPortesMicros: bigint = totalPucMicros + BigInt(portesMicros);

    const mediaMargenMicroporcentaje: bigint =
      totalPvpMicros === 0n
        ? 0n
        : this.roundDivide(
            (totalPvpMicros - totalPucConPortesMicros) * MICRO_PERCENTAGE_100_PERCENT,
            totalPvpMicros,
          );

    return {
      totalLineas: lines.length,
      totalArticulos: this.toSafeNumber(totalArticulos, 'Total artículos'),
      totalBeneficiosMicros: this.toSafeNumber(totalBeneficiosMicros, 'Total beneficios'),
      totalPvpMicros: this.toSafeNumber(totalPvpMicros, 'Total PVP'),
      portesMicros,
      mediaMargenMicroporcentaje: this.toSafeNumber(mediaMargenMicroporcentaje, 'Media margen'),
      subtotalMicros: this.toSafeNumber(subtotalMicros, 'Subtotal'),
      descuentoGlobalBps,
      ivaMicros: this.toSafeNumber(ivaMicros, 'IVA'),
      recargoEquivalenciaMicros: this.toSafeNumber(recargoEquivalenciaMicros, 'RE'),
      desgloseFiscal,
      totalFacturaMicros: this.toSafeNumber(totalFacturaMicros, 'Total factura'),
      totalSinIvaMicros: this.toSafeNumber(subtotalMicros, 'Total sin IVA'),
    };
  }

  /**
   * Incorpora una base económica al grupo fiscal
   * correspondiente.
   */
  private static addTaxBase(
    groups: Map<string, TaxAccumulator>,
    ivaBps: number,
    recargoEquivalenciaBps: number,
    baseNumerator: bigint,
  ): void {
    if (baseNumerator === 0n) {
      return;
    }

    const key: string = `${ivaBps}:${recargoEquivalenciaBps}`;

    const existing: TaxAccumulator | undefined = groups.get(key);

    if (existing !== undefined) {
      existing.baseNumerator += baseNumerator;

      return;
    }

    groups.set(key, {
      ivaBps,
      recargoEquivalenciaBps,
      baseNumerator,
    });
  }

  /**
   * Convierte los acumuladores exactos en el
   * desglose fiscal expresado en microeuros.
   */
  private static buildTaxBreakdown(
    groups: ReadonlyMap<string, TaxAccumulator>,
  ): readonly PurchaseOrderTaxBreakdown[] {
    return [...groups.values()]
      .sort(
        (first: TaxAccumulator, second: TaxAccumulator): number =>
          first.ivaBps - second.ivaBps ||
          first.recargoEquivalenciaBps - second.recargoEquivalenciaBps,
      )
      .map((group: TaxAccumulator): PurchaseOrderTaxBreakdown => ({
        ivaBps: group.ivaBps,
        recargoEquivalenciaBps: group.recargoEquivalenciaBps,
        baseMicros: this.toSafeNumber(
          this.roundDivide(group.baseNumerator, BASE_FACTOR_DENOMINATOR),
          'Base fiscal',
        ),
        ivaMicros: this.toSafeNumber(
          this.roundDivide(
            group.baseNumerator * BigInt(group.ivaBps),
            BASE_FACTOR_DENOMINATOR * BASIS_POINTS_100_PERCENT,
          ),
          'IVA',
        ),
        recargoEquivalenciaMicros: this.toSafeNumber(
          this.roundDivide(
            group.baseNumerator * BigInt(group.recargoEquivalenciaBps),
            BASE_FACTOR_DENOMINATOR * BASIS_POINTS_100_PERCENT,
          ),
          'RE',
        ),
      }));
  }

  /**
   * Comprueba la validez económica mínima
   * de una línea antes de agregarla.
   */
  private static validateLine(line: PurchaseOrderLineState): void {
    this.assertNonNegativeSafeInteger(line.unidades, 'Unidades');

    this.assertNonNegativeSafeInteger(line.palbMicros, 'Precio albarán');

    this.assertNonNegativeSafeInteger(line.pucMicros, 'PUC');

    this.assertNonNegativeSafeInteger(line.pvpMicros, 'PVP');

    this.assertPercentage(line.descuentoBps, 'Descuento de línea');

    this.assertNonNegativeSafeInteger(line.ivaBps, 'IVA');

    this.assertNonNegativeSafeInteger(line.recargoEquivalenciaBps, 'RE');
  }

  /**
   * Comprueba un porcentaje expresado
   * en basis points.
   */
  private static assertPercentage(value: number, fieldName: string): void {
    this.assertNonNegativeSafeInteger(value, fieldName);

    if (value > Number(BASIS_POINTS_100_PERCENT)) {
      throw new Error(`${fieldName} debe estar entre 0 % y 100 %.`);
    }
  }

  /**
   * Comprueba que un valor sea un entero seguro
   * y no negativo.
   */
  private static assertNonNegativeSafeInteger(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${fieldName} debe ser un entero seguro.`);
    }

    if (value < 0) {
      throw new Error(`${fieldName} no puede ser negativo.`);
    }
  }

  /**
   * Divide dos enteros aplicando redondeo
   * simétrico al entero más próximo.
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
   * Convierte un BigInt a number comprobando
   * que continúa dentro del rango seguro.
   */
  private static toSafeNumber(value: bigint, fieldName: string): number {
    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(`${fieldName} supera el rango seguro de enteros.`);
    }

    return result;
  }
}
