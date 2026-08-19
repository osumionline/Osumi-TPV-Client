import type TipoPago from '@model/tipos-pago/tipo-pago.model';

const TIPO_PAGO_EFECTIVO_SLUG: string = 'efectivo';

/**
 * Representa un pago temporal dentro de la finalización de una venta.
 *
 * El importe indica la cantidad aplicada al total de la venta.
 *
 * En efectivo puede existir además una cantidad entregada superior,
 * generando el cambio correspondiente.
 */
export default class VentaPagoEnCurso {
  readonly tipoPago: TipoPago;
  readonly tipoPagoPublicId: string;
  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
  readonly esEfectivo: boolean;

  constructor(tipoPago: TipoPago, importeCents: number, entregadoCents: number | null = null) {
    const tipoPagoPublicId: string = this.requireTipoPagoPersistido(tipoPago);

    this.requireImporte(importeCents);

    this.tipoPago = tipoPago;
    this.tipoPagoPublicId = tipoPagoPublicId;
    this.importeCents = importeCents;
    this.esEfectivo = tipoPago.slug === TIPO_PAGO_EFECTIVO_SLUG;

    if (!this.esEfectivo) {
      if (entregadoCents !== null) {
        throw new Error('La cantidad entregada solo puede indicarse para un pago en efectivo.');
      }

      this.entregadoCents = null;
      this.cambioCents = 0;

      return;
    }

    /*
     * En una devolución en efectivo el comercio entrega dinero
     * al cliente, por lo que no existe una cantidad "entregada
     * por el cliente" ni cambio.
     */
    if (importeCents < 0) {
      if (entregadoCents !== null) {
        throw new Error(
          'Una devolución en efectivo no puede tener una cantidad entregada por el cliente.',
        );
      }

      this.entregadoCents = null;
      this.cambioCents = 0;

      return;
    }

    const efectivoEntregadoCents: number = entregadoCents ?? importeCents;

    this.requireEntregado(efectivoEntregadoCents, importeCents);

    this.entregadoCents = efectivoEntregadoCents;
    this.cambioCents = efectivoEntregadoCents - importeCents;
  }

  /**
   * Comprueba que el tipo de pago pueda identificarse posteriormente
   * mediante su publicId y no dependa de un ID interno de SQLite.
   */
  private requireTipoPagoPersistido(tipoPago: TipoPago): string {
    const publicId: string | null = tipoPago.publicId;

    if (publicId === null || publicId.trim().length === 0) {
      throw new Error('El tipo de pago debe estar persistido.');
    }

    return publicId;
  }

  /**
   * Un pago debe representar siempre una cantidad real distinta de cero.
   *
   * El signo positivo o negativo se valida posteriormente contra
   * el total de la finalización.
   */
  private requireImporte(importeCents: number): void {
    if (!Number.isSafeInteger(importeCents) || importeCents === 0) {
      throw new RangeError(
        'El importe del pago debe ser un número entero de céntimos distinto de cero.',
      );
    }
  }

  /**
   * Valida el efectivo recibido de un cliente.
   */
  private requireEntregado(entregadoCents: number, importeCents: number): void {
    if (!Number.isSafeInteger(entregadoCents)) {
      throw new RangeError('La cantidad entregada en efectivo no es válida.');
    }

    if (entregadoCents < importeCents) {
      throw new RangeError(
        'La cantidad entregada en efectivo no puede ser inferior al importe aplicado.',
      );
    }
  }
}
