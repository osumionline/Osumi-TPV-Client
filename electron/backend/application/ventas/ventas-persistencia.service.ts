import type {
  GuardarVentaLineaRecordCommand,
  GuardarVentaPagoRecordCommand,
  GuardarVentaRecordCommand,
} from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import type {
  GuardarVentaCommand,
  GuardarVentaLineaCommand,
  GuardarVentaPagoCommand,
} from '@desktop-contracts/ventas/guardar-venta-command.interface';

const MICROS_PER_CENT: number = 10_000;

export default class VentasPersistenciaService {
  constructor(private readonly ventasPersistenciaRepository: VentasPersistenciaRepository) {}

  async save(command: GuardarVentaCommand): Promise<VentaPersistidaRecord> {
    const publicId: string = this.requirePublicId(command.publicId, 'venta');

    const cajaPublicId: string = this.requirePublicId(command.cajaPublicId, 'caja');

    const empleadoPublicId: string = this.requirePublicId(command.empleadoPublicId, 'empleado');

    const clientePublicId: string | null = this.normalizeNullablePublicId(
      command.clientePublicId,
      'cliente',
    );

    const devolucionVentaOrigenPublicId: string | null = this.normalizeNullablePublicId(
      command.devolucionVentaOrigenPublicId,
      'venta origen de la devolución',
    );

    const reservasOrigenPublicIds: readonly string[] = this.normalizeReservasOrigen(
      command.reservasOrigenPublicIds,
    );

    if (reservasOrigenPublicIds.length > 0 && clientePublicId === null) {
      throw new Error('Una venta procedente de reservas debe tener un cliente.');
    }

    if (!Array.isArray(command.lineas) || command.lineas.length === 0) {
      throw new Error('La venta debe contener al menos una línea.');
    }

    const devolucionesOrigen: Set<string> = new Set<string>();

    const reservasLineasOrigen: Set<string> = new Set<string>();

    const lineas: readonly GuardarVentaLineaRecordCommand[] = command.lineas.map(
      (linea: GuardarVentaLineaCommand): GuardarVentaLineaRecordCommand =>
        this.normalizeLinea(linea, devolucionesOrigen, reservasLineasOrigen),
    );

    this.validateOrigenes(lineas, devolucionVentaOrigenPublicId, reservasOrigenPublicIds);

    const totalCents: number = this.requireSafeInteger(
      command.totalCents,
      'El total de la venta no es válido.',
    );

    const totalLineasMicros: number = this.sumLineasMicros(lineas);

    const totalLineasCents: number = this.microsToCents(totalLineasMicros);

    if (totalLineasCents !== totalCents) {
      throw new Error('El total de las líneas no coincide con el total de la venta.');
    }

    const pagos: readonly GuardarVentaPagoRecordCommand[] = this.normalizePagos(
      command.pagos,
      totalCents,
    );

    const recordCommand: GuardarVentaRecordCommand = {
      publicId,
      cajaPublicId,
      empleadoPublicId,
      clientePublicId,
      devolucionVentaOrigenPublicId,
      reservasOrigenPublicIds,
      totalCents,
      lineas,
      pagos,
    };

    return this.ventasPersistenciaRepository.save(recordCommand);
  }

  private normalizeLinea(
    linea: GuardarVentaLineaCommand,
    devolucionesOrigen: Set<string>,
    reservasLineasOrigen: Set<string>,
  ): GuardarVentaLineaRecordCommand {
    const articuloPublicId: string | null = this.normalizeNullablePublicId(
      linea.articuloPublicId,
      'artículo de la línea',
    );

    const nombre: string = this.requireNombreLinea(linea.nombre);

    const pucMicros: number = this.requireNonNegativeSafeInteger(
      linea.pucMicros,
      'El PUC de una línea no es válido.',
    );

    const pvpMicros: number = this.requireSafeInteger(
      linea.pvpMicros,
      'El PVP de una línea no es válido.',
    );

    const ivaBps: number = this.requireBps(linea.ivaBps, 'El IVA de una línea no es válido.');

    const importeMicros: number = this.requireSafeInteger(
      linea.importeMicros,
      'El importe de una línea no es válido.',
    );

    const descuentoBps: number = this.requireBps(
      linea.descuentoBps,
      'El descuento porcentual de una línea no es válido.',
    );

    const importeDescuentoMicros: number = this.requireNonNegativeSafeInteger(
      linea.importeDescuentoMicros,
      'El descuento fijo de una línea no es válido.',
    );

    const unidades: number = this.requireSafeInteger(
      linea.unidades,
      'Las unidades de una línea no son válidas.',
    );

    if (unidades === 0) {
      throw new RangeError('Las unidades de una línea de venta no pueden ser cero.');
    }

    if (typeof linea.regalo !== 'boolean') {
      throw new Error('El indicador de regalo de una línea no es válido.');
    }

    const devolucionLineaOrigenPublicId: string | null = this.normalizeNullablePublicId(
      linea.devolucionLineaOrigenPublicId,
      'línea origen de la devolución',
    );

    const reservaLineaOrigenPublicId: string | null = this.normalizeNullablePublicId(
      linea.reservaLineaOrigenPublicId,
      'línea origen de la reserva',
    );

    if (devolucionLineaOrigenPublicId !== null && reservaLineaOrigenPublicId !== null) {
      throw new Error(
        'Una línea no puede proceder simultáneamente de una devolución y de una reserva.',
      );
    }

    /*
     * Las líneas ordinarias utilizan una única
     * representación de descuento.
     *
     * Las líneas históricas de devolución o reserva,
     * en cambio, pueden conservar simultáneamente el
     * porcentaje original y el importe económico
     * histórico correspondiente.
     */
    if (
      devolucionLineaOrigenPublicId === null &&
      reservaLineaOrigenPublicId === null &&
      descuentoBps !== 0 &&
      importeDescuentoMicros !== 0
    ) {
      throw new Error(
        'Una línea ordinaria no puede contener simultáneamente descuento porcentual y descuento fijo.',
      );
    }

    if (devolucionLineaOrigenPublicId !== null) {
      if (unidades >= 0) {
        throw new Error('Una línea de devolución debe tener unidades negativas.');
      }

      if (importeMicros > 0) {
        throw new Error('Una línea de devolución no puede tener un importe positivo.');
      }

      this.requireUniqueOrigen(
        devolucionLineaOrigenPublicId,
        devolucionesOrigen,
        'No se puede devolver dos veces la misma línea dentro de una única venta.',
      );
    } else {
      if (unidades <= 0) {
        throw new Error('Una línea que no sea una devolución debe tener unidades positivas.');
      }

      if (importeMicros < 0) {
        throw new Error('Una línea que no sea una devolución no puede tener un importe negativo.');
      }
    }

    if (reservaLineaOrigenPublicId !== null) {
      this.requireUniqueOrigen(
        reservaLineaOrigenPublicId,
        reservasLineasOrigen,
        'Una misma línea de reserva no puede aparecer dos veces en la venta.',
      );
    }

    if (linea.regalo && importeMicros !== 0) {
      throw new Error('Una línea marcada como regalo debe tener importe cero.');
    }

    return {
      articuloPublicId,
      nombre,
      pucMicros,
      pvpMicros,
      ivaBps,
      importeMicros,
      descuentoBps,
      importeDescuentoMicros,
      unidades,
      regalo: linea.regalo,
      devolucionLineaOrigenPublicId,
      reservaLineaOrigenPublicId,
    };
  }

  private normalizePagos(
    pagosValue: readonly GuardarVentaPagoCommand[],
    totalCents: number,
  ): readonly GuardarVentaPagoRecordCommand[] {
    if (!Array.isArray(pagosValue)) {
      throw new Error('Los pagos de la venta no son válidos.');
    }

    if (totalCents === 0) {
      if (pagosValue.length !== 0) {
        throw new Error('Una venta con total cero no debe contener pagos.');
      }

      return [];
    }

    if (pagosValue.length === 0) {
      throw new Error('La venta debe estar completamente liquidada.');
    }

    const tiposPago: Set<string> = new Set<string>();

    let importeTotalCents: number = 0;

    const pagos: GuardarVentaPagoRecordCommand[] = pagosValue.map(
      (pago: GuardarVentaPagoCommand): GuardarVentaPagoRecordCommand => {
        const normalizedPago: GuardarVentaPagoRecordCommand = this.normalizePago(
          pago,
          totalCents,
          tiposPago,
        );

        importeTotalCents = this.safeAdd(
          importeTotalCents,
          normalizedPago.importeCents,
          'La suma de los pagos supera el rango numérico seguro.',
        );

        return normalizedPago;
      },
    );

    if (importeTotalCents !== totalCents) {
      throw new Error('La suma de los pagos no coincide con el total de la venta.');
    }

    return pagos;
  }

  private normalizePago(
    pago: GuardarVentaPagoCommand,
    totalCents: number,
    tiposPago: Set<string>,
  ): GuardarVentaPagoRecordCommand {
    const tipoPagoPublicId: string = this.requirePublicId(pago.tipoPagoPublicId, 'tipo de pago');

    this.requireUniqueOrigen(
      tipoPagoPublicId,
      tiposPago,
      'No se puede utilizar dos veces el mismo tipo de pago.',
    );

    const importeCents: number = this.requireSafeInteger(
      pago.importeCents,
      'El importe de un pago no es válido.',
    );

    if (importeCents === 0) {
      throw new RangeError('El importe de un pago no puede ser cero.');
    }

    if (totalCents > 0 && importeCents < 0) {
      throw new Error('Una venta positiva no puede contener pagos negativos.');
    }

    if (totalCents < 0 && importeCents > 0) {
      throw new Error('Una devolución neta no puede contener pagos positivos.');
    }

    const entregadoCents: number | null = this.normalizeEntregadoCents(pago.entregadoCents);

    const cambioCents: number = this.requireNonNegativeSafeInteger(
      pago.cambioCents,
      'El cambio de un pago no es válido.',
    );

    if (totalCents < 0) {
      if (entregadoCents !== null || cambioCents !== 0) {
        throw new Error('Un reembolso no puede contener importe entregado ni cambio.');
      }
    } else if (entregadoCents === null) {
      if (cambioCents !== 0) {
        throw new Error('Un pago sin importe entregado no puede generar cambio.');
      }
    } else {
      if (entregadoCents < importeCents) {
        throw new Error('El importe entregado no puede ser inferior al importe aplicado.');
      }

      const expectedCambioCents: number = this.safeAdd(
        entregadoCents,
        -importeCents,
        'El cálculo del cambio supera el rango numérico seguro.',
      );

      if (cambioCents !== expectedCambioCents) {
        throw new Error('El cambio indicado no coincide con el importe entregado.');
      }
    }

    return {
      tipoPagoPublicId,
      importeCents,
      entregadoCents,
      cambioCents,
    };
  }

  private validateOrigenes(
    lineas: readonly GuardarVentaLineaRecordCommand[],
    devolucionVentaOrigenPublicId: string | null,
    reservasOrigenPublicIds: readonly string[],
  ): void {
    const tieneLineasDevolucion: boolean = lineas.some(
      (linea: GuardarVentaLineaRecordCommand): boolean =>
        linea.devolucionLineaOrigenPublicId !== null,
    );

    if (tieneLineasDevolucion && devolucionVentaOrigenPublicId === null) {
      throw new Error('Las líneas de devolución deben indicar su venta de origen.');
    }

    if (!tieneLineasDevolucion && devolucionVentaOrigenPublicId !== null) {
      throw new Error('Se ha indicado una venta origen de devolución sin líneas devueltas.');
    }

    const tieneLineasReserva: boolean = lineas.some(
      (linea: GuardarVentaLineaRecordCommand): boolean => linea.reservaLineaOrigenPublicId !== null,
    );

    if (tieneLineasReserva && reservasOrigenPublicIds.length === 0) {
      throw new Error('Las líneas procedentes de reserva deben indicar sus reservas de origen.');
    }
  }

  private normalizeReservasOrigen(value: readonly string[]): readonly string[] {
    if (!Array.isArray(value)) {
      throw new Error('Las reservas de origen de la venta no son válidas.');
    }

    const publicIds: string[] = [];
    const uniquePublicIds: Set<string> = new Set<string>();

    for (const publicIdValue of value) {
      const publicId: string = this.requirePublicId(publicIdValue, 'reserva origen');

      this.requireUniqueOrigen(
        publicId,
        uniquePublicIds,
        'No se puede indicar dos veces la misma reserva de origen.',
      );

      publicIds.push(publicId);
    }

    return publicIds;
  }

  private normalizeNullablePublicId(value: string | null, fieldName: string): string | null {
    if (value === null) {
      return null;
    }

    return this.requirePublicId(value, fieldName);
  }

  private requirePublicId(value: string, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`El identificador de ${fieldName} no es válido.`);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(`El identificador de ${fieldName} no es válido.`);
    }

    return normalizedValue;
  }

  private requireNombreLinea(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('El nombre de una línea no es válido.');
    }

    const nombre: string = value.trim();

    if (nombre.length === 0 || nombre.length > 200) {
      throw new Error('El nombre de una línea debe contener entre 1 y 200 caracteres.');
    }

    return nombre;
  }

  private normalizeEntregadoCents(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return this.requireNonNegativeSafeInteger(
      value,
      'El importe entregado de un pago no es válido.',
    );
  }

  private requireBps(value: number, message: string): number {
    const normalizedValue: number = this.requireSafeInteger(value, message);

    if (normalizedValue < 0 || normalizedValue > 10_000) {
      throw new RangeError(message);
    }

    return normalizedValue;
  }

  private requireNonNegativeSafeInteger(value: number, message: string): number {
    const normalizedValue: number = this.requireSafeInteger(value, message);

    if (normalizedValue < 0) {
      throw new RangeError(message);
    }

    return normalizedValue;
  }

  private requireSafeInteger(value: number, message: string): number {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(message);
    }

    return value;
  }

  private requireUniqueOrigen(publicId: string, values: Set<string>, message: string): void {
    if (values.has(publicId)) {
      throw new Error(message);
    }

    values.add(publicId);
  }

  private sumLineasMicros(lineas: readonly GuardarVentaLineaRecordCommand[]): number {
    let totalMicros: number = 0;

    for (const linea of lineas) {
      totalMicros = this.safeAdd(
        totalMicros,
        linea.importeMicros,
        'La suma de las líneas supera el rango numérico seguro.',
      );
    }

    return totalMicros;
  }

  private microsToCents(micros: number): number {
    const sign: number = micros < 0 ? -1 : 1;

    const cents: number = sign * Math.round(Math.abs(micros) / MICROS_PER_CENT);

    return this.requireSafeInteger(cents, 'El total de la venta supera el rango numérico seguro.');
  }

  private safeAdd(left: number, right: number, message: string): number {
    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new RangeError(message);
    }

    return result;
  }
}
