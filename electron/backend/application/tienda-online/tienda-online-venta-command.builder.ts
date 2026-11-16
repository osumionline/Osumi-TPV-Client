import type { TiendaOnlinePedidoConLineas } from '@backend/application/tienda-online/tienda-online-pedidos.service';
import VentaOnlineCommandValidator from '@backend/application/ventas/venta-online-command.validator';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type {
  GuardarVentaLineaRecordCommand,
  GuardarVentaPagoRecordCommand,
} from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import { createHash } from 'node:crypto';

const MICROS_PER_CENT: number = 10_000;
const HOUR_MS: number = 3_600_000;

/**
 * Contexto explícito para interpretar pedidos de una fuente.
 *
 * fuenteId debe permanecer estable aunque cambien la URL
 * de la API o su credencial.
 *
 * metodosPago relaciona el identificador remoto
 * con el slug de un tipo de pago local.
 */
export interface TiendaOnlineImportacionContexto {
  readonly fuenteId: string;
  readonly zonaHoraria: string;
  readonly metodosPago: Readonly<Record<string, string>>;
}

/**
 * Construye comandos comerciales definitivos a partir de
 * pedidos cuyas líneas ya han sido preparadas.
 *
 * No escribe en SQLite ni realiza llamadas HTTP.
 */
export default class TiendaOnlineVentaCommandBuilder {
  private readonly validator: VentaOnlineCommandValidator = new VentaOnlineCommandValidator();

  constructor(
    private readonly tiposPagoRepository: Pick<TipoPagoRepository, 'findAll'>,
    private readonly contexto: TiendaOnlineImportacionContexto,
  ) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(contexto.fuenteId)) {
      throw new Error('La identidad de la tienda online no es válida.');
    }
  }

  /**
   * Construye un comando completo con identidad,
   * líneas, cobros y fecha inequívoca.
   */
  async build(prepared: TiendaOnlinePedidoConLineas): Promise<GuardarVentaOnlineRecordCommand> {
    const order = prepared.order;

    const identity: string = createHash('sha256')
      .update(JSON.stringify([this.contexto.fuenteId, order.reference]))
      .digest('hex');

    const lineas: GuardarVentaLineaRecordCommand[] = [...prepared.lineas];

    if (order.shippingCents > 0) {
      lineas.push(this.createShippingLine(order.shippingCents, order.shippingVatBps));
    }

    const pagos: readonly GuardarVentaPagoRecordCommand[] = await this.resolvePagos(
      order.paymentMethod,
      order.totalCents,
    );

    const command: GuardarVentaOnlineRecordCommand = {
      publicId: `venta-online-${identity}`,
      referenciaExterna: `tienda-online-${identity}`,
      pagadaAt: this.toUtc(order.paidAt),
      totalCents: order.totalCents,
      lineas,
      pagos,
    };

    this.validator.validate(command);

    return command;
  }

  /**
   * Convierte los gastos de envío en una línea libre.
   *
   * No tiene artículo local ni altera existencias.
   * Solo se acepta cuando el IVA histórico es conocido.
   */
  private createShippingLine(
    shippingCents: number,
    ivaBps: number | null,
  ): GuardarVentaLineaRecordCommand {
    if (!Number.isSafeInteger(ivaBps) || ivaBps === null || ivaBps < 0 || ivaBps > 10_000) {
      throw new Error('Los gastos de envío no tienen un IVA histórico válido.');
    }

    const importeMicros: number = shippingCents * MICROS_PER_CENT;

    if (!Number.isSafeInteger(importeMicros) || importeMicros <= 0) {
      throw new Error('El importe de transporte no es válido.');
    }

    return {
      articuloPublicId: null,
      localizador: 0,
      marca: 'Sin marca',
      nombre: 'Gastos de envío',
      pucMicros: 0,
      pvpMicros: importeMicros,
      ivaBps,
      importeMicros,
      descuentoBps: 0,
      importeDescuentoMicros: 0,
      unidades: 1,
      regalo: false,
      devolucionLineaOrigenPublicId: null,
      reservaLineaOrigenPublicId: null,
    };
  }

  /**
   * Resuelve un método remoto contra un tipo local activo.
   *
   * No presupone que un código remoto tenga un significado
   * concreto. La equivalencia debe existir expresamente.
   */
  private async resolvePagos(
    remoteMethod: string,
    totalCents: number,
  ): Promise<readonly GuardarVentaPagoRecordCommand[]> {
    if (totalCents === 0) {
      return [];
    }

    if (!Object.prototype.hasOwnProperty.call(this.contexto.metodosPago, remoteMethod)) {
      throw new Error(`No existe equivalencia de pago para "${remoteMethod}".`);
    }

    const slug: string | undefined = this.contexto.metodosPago[remoteMethod];

    if (typeof slug !== 'string' || slug.trim() === '') {
      throw new Error('La equivalencia del método de pago online no es válida.');
    }

    const tiposPago: readonly TipoPagoRecord[] = await this.tiposPagoRepository.findAll();

    const matching: readonly TipoPagoRecord[] = tiposPago.filter(
      (tipo: TipoPagoRecord): boolean => tipo.slug === slug,
    );

    const tipoPago: TipoPagoRecord | undefined = matching[0];

    if (matching.length !== 1 || tipoPago === undefined || !tipoPago.fisico) {
      throw new Error(`El tipo de pago local "${slug}" no está disponible para guardar la venta.`);
    }

    const efectivo: boolean = tipoPago.slug === 'efectivo';

    return [
      {
        tipoPagoPublicId: tipoPago.publicId,
        importeCents: totalCents,
        entregadoCents: efectivo ? totalCents : null,
        cambioCents: 0,
      },
    ];
  }

  /**
   * Convierte un DATETIME civil local a ISO UTC.
   *
   * Exige una zona horaria explícita y comprueba que
   * la hora existe exactamente una vez en ella.
   *
   * Esto rechaza tanto horas inexistentes en primavera
   * como horas duplicadas en otoño.
   */
  private toUtc(paidAt: string): string {
    const match: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
      paidAt,
    );

    if (match === null) {
      throw new Error('La fecha de pago online no es válida.');
    }

    const components: number[] = match.slice(1).map(Number);

    const year: number = components[0] ?? NaN;
    const month: number = components[1] ?? NaN;
    const day: number = components[2] ?? NaN;
    const hour: number = components[3] ?? NaN;
    const minute: number = components[4] ?? NaN;
    const second: number = components[5] ?? NaN;

    const localMillis: number = Date.UTC(year, month - 1, day, hour, minute, second);

    const calendarDate: Date = new Date(localMillis);

    if (
      !Number.isFinite(localMillis) ||
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day ||
      calendarDate.getUTCHours() !== hour ||
      calendarDate.getUTCMinutes() !== minute ||
      calendarDate.getUTCSeconds() !== second
    ) {
      throw new Error('La fecha de pago online no es válida.');
    }

    let formatter: Intl.DateTimeFormat;

    try {
      formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: this.contexto.zonaHoraria,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      throw new Error('La zona horaria de la tienda online no es válida.');
    }

    const matches: Set<number> = new Set<number>();

    /*
     * Obtenemos los offsets posibles alrededor de la
     * fecha. Comprobamos cada candidato contra la hora
     * civil original y no elegimos uno arbitrariamente.
     */
    for (let hours = -36; hours <= 36; hours += 6) {
      const sample: number = localMillis + hours * HOUR_MS;

      const offset: number = this.wallTimeMillis(formatter, sample) - sample;

      const candidate: number = localMillis - offset;

      if (this.wallTimeMillis(formatter, candidate) === localMillis) {
        matches.add(candidate);
      }
    }

    if (matches.size !== 1) {
      throw new Error('La fecha de pago online es inexistente o ambigua en su zona horaria.');
    }

    const instant: number | undefined = matches.values().next().value;

    if (instant === undefined) {
      throw new Error('La fecha de pago online no es válida.');
    }

    return new Date(instant).toISOString();
  }

  /**
   * Representa un instante como componentes civiles
   * interpretados en la zona horaria indicada.
   */
  private wallTimeMillis(formatter: Intl.DateTimeFormat, instant: number): number {
    const parts: Intl.DateTimeFormatPart[] = formatter.formatToParts(new Date(instant));

    const read = (type: string): number => {
      const value: string | undefined = parts.find((part): boolean => part.type === type)?.value;

      if (value === undefined) {
        throw new Error('No se ha podido interpretar la fecha de la tienda online.');
      }

      return Number(value);
    };

    return Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
      read('second'),
    );
  }
}
