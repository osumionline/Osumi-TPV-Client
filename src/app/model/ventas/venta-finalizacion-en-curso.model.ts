import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';

/**
 * Representa el intento temporal de liquidar económicamente una venta.
 *
 * No modifica VentaEnCurso y puede descartarse por completo
 * si el usuario cancela la finalización.
 */
export default class VentaFinalizacionEnCurso {
  private pagosValue: VentaPagoEnCurso[] = [];

  constructor(readonly totalCents: number) {
    if (!Number.isSafeInteger(totalCents)) {
      throw new RangeError('El total de la finalización debe ser un número entero de céntimos.');
    }
  }

  /**
   * Pagos actualmente incorporados a la finalización.
   */
  get pagos(): readonly VentaPagoEnCurso[] {
    return this.pagosValue;
  }

  /**
   * Suma de todos los importes aplicados.
   *
   * Puede ser negativa cuando la operación es una devolución neta.
   */
  get totalPagadoCents(): number {
    return this.pagosValue.reduce(
      (total: number, pago: VentaPagoEnCurso): number => total + pago.importeCents,
      0,
    );
  }

  /**
   * Importe que todavía queda por liquidar.
   *
   * En una devolución conserva signo negativo.
   */
  get pendienteCents(): number {
    return this.totalCents - this.totalPagadoCents;
  }

  /**
   * Indica si el total ha quedado liquidado exactamente.
   */
  get completa(): boolean {
    return this.pendienteCents === 0;
  }

  /**
   * Añade un nuevo medio de pago.
   *
   * Un mismo tipo de pago solo puede aparecer una vez.
   */
  addPago(
    tipoPago: TipoPago,
    importeCents: number,
    entregadoCents: number | null = null,
  ): VentaPagoEnCurso {
    const pago: VentaPagoEnCurso = new VentaPagoEnCurso(tipoPago, importeCents, entregadoCents);

    if (
      this.pagosValue.some(
        (actual: VentaPagoEnCurso): boolean => actual.tipoPagoPublicId === pago.tipoPagoPublicId,
      )
    ) {
      throw new Error('El tipo de pago ya está incluido en la finalización.');
    }

    const nuevoTotalPagadoCents: number = this.totalPagadoCents + pago.importeCents;

    this.requirePagoCompatible(pago, nuevoTotalPagadoCents);

    this.pagosValue = [...this.pagosValue, pago];

    return pago;
  }

  /**
   * Sustituye los datos de un pago ya existente.
   */
  updatePago(
    tipoPagoPublicId: string,
    importeCents: number,
    entregadoCents: number | null = null,
  ): VentaPagoEnCurso {
    const index: number = this.pagosValue.findIndex(
      (pago: VentaPagoEnCurso): boolean => pago.tipoPagoPublicId === tipoPagoPublicId,
    );

    if (index === -1) {
      throw new Error('El tipo de pago no está incluido en la finalización.');
    }

    const pagoActual: VentaPagoEnCurso = this.pagosValue[index];

    const nuevoPago: VentaPagoEnCurso = new VentaPagoEnCurso(
      pagoActual.tipoPago,
      importeCents,
      entregadoCents,
    );

    const nuevoTotalPagadoCents: number =
      this.totalPagadoCents - pagoActual.importeCents + nuevoPago.importeCents;

    this.requirePagoCompatible(nuevoPago, nuevoTotalPagadoCents);

    const nuevosPagos: VentaPagoEnCurso[] = [...this.pagosValue];

    nuevosPagos[index] = nuevoPago;
    this.pagosValue = nuevosPagos;

    return nuevoPago;
  }

  /**
   * Elimina un medio de pago de la finalización.
   */
  removePago(tipoPagoPublicId: string): void {
    this.pagosValue = this.pagosValue.filter(
      (pago: VentaPagoEnCurso): boolean => pago.tipoPagoPublicId !== tipoPagoPublicId,
    );
  }

  /**
   * Comprueba que el pago tenga el mismo sentido económico
   * que la operación y que el conjunto no sobrepase su total.
   */
  private requirePagoCompatible(pago: VentaPagoEnCurso, nuevoTotalPagadoCents: number): void {
    if (this.totalCents === 0) {
      throw new Error('Una venta con total cero no necesita medios de pago.');
    }

    if (
      (this.totalCents > 0 && pago.importeCents < 0) ||
      (this.totalCents < 0 && pago.importeCents > 0)
    ) {
      throw new RangeError('El signo del pago no coincide con el total de la venta.');
    }

    if (!Number.isSafeInteger(nuevoTotalPagadoCents)) {
      throw new RangeError('La suma de los pagos supera el rango numérico seguro.');
    }

    if (Math.abs(nuevoTotalPagadoCents) > Math.abs(this.totalCents)) {
      throw new RangeError('La suma de los pagos no puede superar el total de la venta.');
    }
  }
}
