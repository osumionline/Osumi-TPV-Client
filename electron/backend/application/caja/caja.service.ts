import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type {
  CajaCierreRecord,
  CajaCierreTipoPagoRecord,
} from '@backend/domain/caja/caja-cierre-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import {
  type CajaCierreInterface,
  CajaCierreConsulta,
  CajaCierreTipoPagoInterface,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface UtcPeriod {
  readonly desde: string;
  readonly hastaExclusive: string;
}

/**
 * Ejecuta las operaciones de negocio relacionadas con la caja.
 */
export default class CajaService {
  constructor(private readonly cajaRepository: CajaRepository) {}

  /**
   * Abre la caja del terminal indicado o devuelve la que ya estuviese abierta.
   */
  async open(command: AbrirCajaCommand): Promise<CajaAbiertaInterface> {
    if (command.terminalPublicId.trim().length === 0) {
      throw new Error('El terminal indicado no es válido.');
    }

    const caja: CajaAbiertaRecord = await this.cajaRepository.open({
      terminalPublicId: command.terminalPublicId.trim(),
    });

    return {
      id: caja.id,
      publicId: caja.publicId,
      idTerminal: caja.idTerminal,
      apertura: caja.apertura,
      importeAperturaCents: caja.importeAperturaCents,
    };
  }

  /**
   * Obtiene los datos económicos canónicos de una caja abierta
   * necesarios para preparar su cierre.
   */
  async getCierre(consulta: CajaCierreConsulta): Promise<CajaCierreInterface> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de cierre de caja no es válida.');
    }

    const cajaPublicId: string = this.requirePublicId(
      consulta.cajaPublicId,
      'La caja indicada no es válida.',
    );

    const record: CajaCierreRecord | null = await this.cajaRepository.findCierre(cajaPublicId);

    if (record === null) {
      throw new Error('La caja indicada no está abierta.');
    }

    const saldoInicialCents: number = this.requireSafeInteger(
      record.importeAperturaCents,
      'El saldo inicial de la caja no es válido.',
    );

    const ventasAfectanCajaCents: number = this.requireSafeInteger(
      record.ventasAfectanCajaCents,
      'El importe de ventas que afectan a caja no es válido.',
    );

    const salidasCajaCents: number = this.requireSafeInteger(
      record.salidasCajaCents,
      'El importe de salidas de caja no es válido.',
    );

    if (salidasCajaCents < 0) {
      throw new Error('El importe de salidas de caja no puede ser negativo.');
    }

    const saldoFinalTeoricoCents: number = this.safeAdd(
      this.safeAdd(
        saldoInicialCents,
        ventasAfectanCajaCents,
        'El saldo final teórico de la caja supera el rango numérico seguro.',
      ),
      -salidasCajaCents,
      'El saldo final teórico de la caja supera el rango numérico seguro.',
    );

    const tiposPago: readonly CajaCierreTipoPagoInterface[] = record.tiposPago.map(
      (tipoPago: CajaCierreTipoPagoRecord): CajaCierreTipoPagoInterface => {
        const operaciones: number = this.requireSafeInteger(
          tipoPago.operaciones,
          'El número de operaciones de un tipo de pago no es válido.',
        );

        if (operaciones < 0) {
          throw new Error('El número de operaciones de un tipo de pago no puede ser negativo.');
        }

        return {
          publicId: tipoPago.publicId,
          nombre: tipoPago.nombre,
          slug: tipoPago.slug,
          afectaCaja: tipoPago.afectaCaja,
          orden: this.requireSafeInteger(
            tipoPago.orden,
            'El orden de un tipo de pago no es válido.',
          ),
          operaciones,
          importeVentasCents: this.requireSafeInteger(
            tipoPago.importeVentasCents,
            'El importe de ventas de un tipo de pago no es válido.',
          ),
        };
      },
    );

    return {
      cajaPublicId: record.cajaPublicId,
      apertura: record.apertura,
      saldoInicialCents,
      ventasAfectanCajaCents,
      salidasCajaCents,
      saldoFinalTeoricoCents,
      tiposPago,
    };
  }

  /**
   * Recupera las salidas correspondientes a un periodo civil local.
   */
  async findSalidas(consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de salidas de caja no es válida.');
    }

    const desde: LocalDateParts = this.requireLocalDate(
      consulta.desde,
      'La fecha inicial de las salidas de caja no es válida.',
    );

    const hasta: LocalDateParts = this.requireLocalDate(
      consulta.hasta,
      'La fecha final de las salidas de caja no es válida.',
    );

    const desdeKey: number = desde.year * 10_000 + desde.month * 100 + desde.day;
    const hastaKey: number = hasta.year * 10_000 + hasta.month * 100 + hasta.day;

    if (desdeKey > hastaKey) {
      throw new Error(
        'La fecha inicial de las salidas de caja no puede ser posterior a la fecha final.',
      );
    }

    const period: UtcPeriod = this.toUtcPeriod(desde, hasta);

    const records: readonly SalidaCajaRecord[] = await this.cajaRepository.findSalidasByPeriod(
      period.desde,
      period.hastaExclusive,
    );

    return records.map((record: SalidaCajaRecord): SalidaCajaInterface =>
      this.toSalidaInterface(record),
    );
  }

  /**
   * Valida y crea una nueva salida en la caja activa.
   */
  async createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface> {
    const normalizedCommand: CrearSalidaCajaCommand = {
      cajaPublicId: this.requirePublicId(command?.cajaPublicId, 'La caja indicada no es válida.'),
      ...this.normalizeSalidaFields(command),
    };

    return this.toSalidaInterface(await this.cajaRepository.createSalida(normalizedCommand));
  }

  /**
   * Valida y actualiza una salida perteneciente a la caja activa.
   */
  async updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface> {
    const normalizedCommand: ActualizarSalidaCajaCommand = {
      publicId: this.requirePublicId(command?.publicId, 'La salida de caja indicada no es válida.'),
      cajaPublicId: this.requirePublicId(command?.cajaPublicId, 'La caja indicada no es válida.'),
      ...this.normalizeSalidaFields(command),
    };

    return this.toSalidaInterface(await this.cajaRepository.updateSalida(normalizedCommand));
  }

  /**
   * Da de baja una salida únicamente si pertenece
   * a la caja activa indicada.
   */
  async deleteSalida(command: EliminarSalidaCajaCommand): Promise<void> {
    const normalizedCommand: EliminarSalidaCajaCommand = {
      publicId: this.requirePublicId(command?.publicId, 'La salida de caja indicada no es válida.'),
      cajaPublicId: this.requirePublicId(command?.cajaPublicId, 'La caja indicada no es válida.'),
    };

    await this.cajaRepository.deleteSalida(normalizedCommand);
  }

  /**
   * Valida un entero procedente de persistencia antes
   * de utilizarlo en cálculos económicos.
   */
  private requireSafeInteger(value: number, message: string): number {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(message);
    }

    return value;
  }

  /**
   * Suma dos enteros protegiendo el rango seguro de JavaScript.
   */
  private safeAdd(left: number, right: number, message: string): number {
    return this.requireSafeInteger(left + right, message);
  }

  /**
   * Normaliza los campos editables de una salida.
   */
  private normalizeSalidaFields(
    command: CrearSalidaCajaCommand | ActualizarSalidaCajaCommand,
  ): Pick<CrearSalidaCajaCommand, 'concepto' | 'descripcion' | 'importeCents'> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos de la salida de caja no son válidos.');
    }

    if (typeof command.concepto !== 'string') {
      throw new Error('El concepto de la salida de caja no es válido.');
    }

    const concepto: string = command.concepto.trim();

    if (concepto.length === 0) {
      throw new Error('El concepto de la salida de caja es obligatorio.');
    }

    if (concepto.length > 250) {
      throw new Error('El concepto de la salida de caja no puede superar los 250 caracteres.');
    }

    if (!Number.isSafeInteger(command.importeCents) || command.importeCents <= 0) {
      throw new Error('El importe de la salida de caja debe ser mayor que cero.');
    }

    let descripcion: string | null = null;

    if (command.descripcion !== null) {
      if (typeof command.descripcion !== 'string') {
        throw new Error('La descripción de la salida de caja no es válida.');
      }

      const normalizedDescripcion: string = command.descripcion.trim();

      descripcion = normalizedDescripcion.length === 0 ? null : normalizedDescripcion;
    }

    return {
      concepto,
      descripcion,
      importeCents: command.importeCents,
    };
  }

  /**
   * Normaliza un identificador público recibido por IPC.
   */
  private requirePublicId(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new Error(message);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(message);
    }

    return normalizedValue;
  }

  /**
   * Convierte el record interno de una salida
   * en su contrato público.
   */
  private toSalidaInterface(record: SalidaCajaRecord): SalidaCajaInterface {
    return {
      publicId: record.publicId,
      concepto: record.concepto,
      descripcion: record.descripcion,
      importeCents: record.importeCents,
      fecha: record.fecha,
      editable: record.editable,
    };
  }

  /**
   * Valida una fecha civil estricta en formato YYYY-MM-DD.
   */
  private requireLocalDate(value: string, message: string): LocalDateParts {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(message);
    }

    const parts: LocalDateParts = {
      year: Number(value.slice(0, 4)),
      month: Number(value.slice(5, 7)),
      day: Number(value.slice(8, 10)),
    };

    const date: Date = this.createLocalMidnight(parts);

    if (
      date.getFullYear() !== parts.year ||
      date.getMonth() !== parts.month - 1 ||
      date.getDate() !== parts.day
    ) {
      throw new Error(message);
    }

    return parts;
  }

  /**
   * Convierte un periodo civil inclusivo en el intervalo UTC [desde, hasta).
   */
  private toUtcPeriod(desde: LocalDateParts, hasta: LocalDateParts): UtcPeriod {
    const desdeDate: Date = this.createLocalMidnight(desde);
    const hastaExclusiveDate: Date = this.createLocalMidnight(hasta);

    hastaExclusiveDate.setDate(hastaExclusiveDate.getDate() + 1);

    return {
      desde: desdeDate.toISOString(),
      hastaExclusive: hastaExclusiveDate.toISOString(),
    };
  }

  /**
   * Construye la medianoche de una fecha civil usando
   * la zona horaria local del terminal.
   */
  private createLocalMidnight(parts: LocalDateParts): Date {
    const date: Date = new Date();

    date.setFullYear(parts.year, parts.month - 1, parts.day);
    date.setHours(0, 0, 0, 0);

    return date;
  }
}
