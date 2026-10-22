import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type {
  GuardarVentaLineaRecordCommand,
  GuardarVentaPagoRecordCommand,
} from '@backend/contracts/ventas/guardar-venta-record-command.interface';

const MICROS_PER_CENT: number = 10_000;

/**
 * Valida la coherencia económica y comercial mínima
 * de una venta online normalizada.
 *
 * No interpreta el payload HTTP de la tienda:
 * trabaja exclusivamente con el contrato interno.
 */
export default class VentaOnlineCommandValidator {
  /**
   * Rechaza cualquier comando que pudiera generar una
   * venta inconsistente o movimientos de stock inválidos.
   */
  validate(command: GuardarVentaOnlineRecordCommand): void {
    if (!Number.isSafeInteger(command.totalCents) || command.totalCents < 0) {
      throw new Error('El total de la venta online no es válido.');
    }

    if (!Array.isArray(command.lineas) || command.lineas.length === 0) {
      throw new Error('La venta online debe contener al menos una línea.');
    }

    if (!Array.isArray(command.pagos)) {
      throw new Error('Los pagos de la venta online no son válidos.');
    }

    let totalLineasMicros: number = 0;

    for (const linea of command.lineas) {
      this.validateLinea(linea);

      totalLineasMicros = this.safeAdd(totalLineasMicros, linea.importeMicros);
    }

    /*
     * La venta almacena euros en céntimos, mientras
     * las líneas conservan precisión de microeuros.
     */
    const totalLineasCents: number = Math.round(totalLineasMicros / MICROS_PER_CENT);

    if (totalLineasCents !== command.totalCents) {
      throw new Error('El total de las líneas online no coincide con el total de la venta.');
    }

    this.validatePagos(command.pagos, command.totalCents);
  }

  /**
   * Las ventas online de esta primera fase son ventas
   * positivas: no importamos devoluciones ni reservas.
   */
  private validateLinea(linea: GuardarVentaLineaRecordCommand): void {
    if (typeof linea !== 'object' || linea === null) {
      throw new Error('Una línea de venta online no es válida.');
    }

    if (
      linea.articuloPublicId !== null &&
      (typeof linea.articuloPublicId !== 'string' ||
        linea.articuloPublicId.trim().length === 0 ||
        linea.articuloPublicId !== linea.articuloPublicId.trim())
    ) {
      throw new Error('El artículo de una línea online no es válido.');
    }

    if (!Number.isSafeInteger(linea.localizador) || linea.localizador < 0) {
      throw new Error('El localizador de una línea online no es válido.');
    }

    if (
      typeof linea.nombre !== 'string' ||
      linea.nombre.trim().length === 0 ||
      linea.nombre.length > 200
    ) {
      throw new Error('El nombre de una línea online no es válido.');
    }

    if (
      typeof linea.marca !== 'string' ||
      linea.marca.trim().length === 0 ||
      linea.marca.length > 100
    ) {
      throw new Error('La marca de una línea online no es válida.');
    }

    if (!Number.isSafeInteger(linea.unidades) || linea.unidades <= 0) {
      throw new Error('Las unidades de una línea online no son válidas.');
    }

    if (
      !Number.isSafeInteger(linea.pucMicros) ||
      linea.pucMicros < 0 ||
      !Number.isSafeInteger(linea.pvpMicros) ||
      linea.pvpMicros < 0 ||
      !Number.isSafeInteger(linea.importeMicros) ||
      linea.importeMicros < 0
    ) {
      throw new Error('Los importes de una línea online no son válidos.');
    }

    if (
      !Number.isSafeInteger(linea.ivaBps) ||
      linea.ivaBps < 0 ||
      linea.ivaBps > 10_000 ||
      !Number.isSafeInteger(linea.descuentoBps) ||
      linea.descuentoBps < 0 ||
      linea.descuentoBps > 10_000 ||
      !Number.isSafeInteger(linea.importeDescuentoMicros) ||
      linea.importeDescuentoMicros < 0
    ) {
      throw new Error('Los impuestos o descuentos de una línea online no son válidos.');
    }

    if (typeof linea.regalo !== 'boolean') {
      throw new Error('El indicador de regalo de una línea online no es válido.');
    }

    if (linea.devolucionLineaOrigenPublicId !== null || linea.reservaLineaOrigenPublicId !== null) {
      throw new Error('Una venta online importada no puede incluir devoluciones ni reservas.');
    }

    if (linea.descuentoBps !== 0 && linea.importeDescuentoMicros !== 0) {
      throw new Error('Una línea online no puede combinar descuento porcentual y fijo.');
    }

    if (linea.regalo && linea.importeMicros !== 0) {
      throw new Error('Una línea online marcada como regalo debe tener importe cero.');
    }
  }

  /**
   * Comprueba que todos los pagos están representados
   * mediante importes válidos y liquidan la venta.
   */
  private validatePagos(pagos: readonly GuardarVentaPagoRecordCommand[], totalCents: number): void {
    if (totalCents === 0) {
      if (pagos.length !== 0) {
        throw new Error('Una venta online de total cero no debe contener pagos.');
      }

      return;
    }

    if (pagos.length === 0) {
      throw new Error('La venta online debe tener al menos un pago.');
    }

    const tiposPago: Set<string> = new Set<string>();
    let totalPagosCents: number = 0;

    for (const pago of pagos) {
      if (typeof pago !== 'object' || pago === null) {
        throw new Error('Uno de los pagos online no es válido.');
      }

      if (
        typeof pago.tipoPagoPublicId !== 'string' ||
        pago.tipoPagoPublicId.trim().length === 0 ||
        pago.tipoPagoPublicId !== pago.tipoPagoPublicId.trim()
      ) {
        throw new Error('El tipo de pago online no es válido.');
      }

      if (tiposPago.has(pago.tipoPagoPublicId)) {
        throw new Error('Una venta online no puede repetir el mismo tipo de pago.');
      }

      tiposPago.add(pago.tipoPagoPublicId);

      if (
        !Number.isSafeInteger(pago.importeCents) ||
        pago.importeCents <= 0 ||
        !Number.isSafeInteger(pago.cambioCents) ||
        pago.cambioCents < 0 ||
        (pago.entregadoCents !== null &&
          (!Number.isSafeInteger(pago.entregadoCents) || pago.entregadoCents < 0))
      ) {
        throw new Error('Los importes de un pago online no son válidos.');
      }

      if (pago.entregadoCents === null && pago.cambioCents !== 0) {
        throw new Error('Un pago online sin importe entregado no puede tener cambio.');
      }

      if (
        pago.entregadoCents !== null &&
        (pago.entregadoCents < pago.importeCents ||
          pago.entregadoCents - pago.cambioCents !== pago.importeCents)
      ) {
        throw new Error('El importe entregado y el cambio de un pago online no cuadran.');
      }

      totalPagosCents = this.safeAdd(totalPagosCents, pago.importeCents);
    }

    if (totalPagosCents !== totalCents) {
      throw new Error('La suma de los pagos online no coincide con el total de la venta.');
    }
  }

  /**
   * Evita acumulaciones fuera del rango entero seguro.
   */
  private safeAdd(first: number, second: number): number {
    const result: number = first + second;

    if (!Number.isSafeInteger(result)) {
      throw new Error('La suma de importes de la venta online supera el rango seguro.');
    }

    return result;
  }
}
