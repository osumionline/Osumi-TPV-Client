import type VentasHistoricoRepository from '@backend/contracts/ventas/ventas-historico.repository.interface';
import type {
  VentaHistoricoDetalleRecord,
  VentaHistoricoLineaRecord,
  VentaHistoricoPagoRecord,
  VentaHistoricoPagoResumenRecord,
  VentaHistoricoResumenRecord,
  VentaHistoricoTotalTipoPagoRecord,
  VentasHistoricoResultadoRecord,
} from '@backend/domain/ventas/venta-historico-record.interface';
import type {
  ResumenHistorico,
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentaHistoricoLinea,
  VentaHistoricoPago,
  VentaHistoricoPagoResumen,
  VentaHistoricoResumen,
  VentaHistoricoTotalTipoPago,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface UtcPeriod {
  readonly desde: string;
  readonly hastaExclusive: string;
}

export default class VentasHistoricoService {
  constructor(private readonly repository: VentasHistoricoRepository) {}

  /**
   * Recupera las ventas y agregados correspondientes a un periodo civil local.
   */
  async findByPeriod(consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta del histórico no es válida.');
    }
    const clientePublicId: string | null = this.normalizeClientePublicId(consulta.clientePublicId);
    const desde: LocalDateParts = this.requireLocalDate(
      consulta.desde,
      'La fecha inicial del histórico no es válida.',
    );
    const hasta: LocalDateParts = this.requireLocalDate(
      consulta.hasta,
      'La fecha final del histórico no es válida.',
    );

    const desdeKey: number = desde.year * 10_000 + desde.month * 100 + desde.day;
    const hastaKey: number = hasta.year * 10_000 + hasta.month * 100 + hasta.day;

    if (desdeKey > hastaKey) {
      throw new Error('La fecha inicial del histórico no puede ser posterior a la fecha final.');
    }

    const period: UtcPeriod = this.toUtcPeriod(desde, hasta);

    const record: VentasHistoricoResultadoRecord = await this.repository.findByPeriod(
      period.desde,
      period.hastaExclusive,
      clientePublicId,
    );

    const ventas: readonly VentaHistoricoResumen[] = record.ventas.map(
      (venta: VentaHistoricoResumenRecord): VentaHistoricoResumen => ({
        id: venta.id,
        publicId: venta.publicId,
        serie: venta.serie,
        numero: venta.numero,
        fecha: venta.fecha,
        totalCents: venta.totalCents,
        clienteNombre: venta.clienteNombre,
        pagos: venta.pagos.map(
          (pago: VentaHistoricoPagoResumenRecord): VentaHistoricoPagoResumen => ({
            tipoPagoPublicId: pago.tipoPagoPublicId,
            nombre: pago.nombre,
            importeCents: pago.importeCents,
          }),
        ),
        ticketBaiEstado: venta.ticketBaiEstado,
        tieneIncidenciaTicketBai: venta.tieneIncidenciaTicketBai,
      }),
    );

    const totalesPorTipoPago: readonly VentaHistoricoTotalTipoPago[] =
      record.resumen.totalesPorTipoPago.map(
        (total: VentaHistoricoTotalTipoPagoRecord): VentaHistoricoTotalTipoPago => ({
          tipoPagoPublicId: total.tipoPagoPublicId,
          nombre: total.nombre,
          importeCents: total.importeCents,
        }),
      );

    const resumen: ResumenHistorico = {
      numeroVentas: record.resumen.numeroVentas,
      totalCents: record.resumen.totalCents,
      ticketMedioCents: record.resumen.ticketMedioCents,
      beneficioCents: record.resumen.beneficioCents,
      totalesPorTipoPago,
    };

    return {
      ventas,
      resumen,
    };
  }

  /**
   * Recupera el detalle histórico de una venta y deriva sus capacidades postventa.
   */
  async findDetalleByVentaId(idVenta: number): Promise<VentaHistoricoDetalle | null> {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new Error('El identificador de la venta no es válido.');
    }

    const record: VentaHistoricoDetalleRecord | null =
      await this.repository.findDetalleByVentaId(idVenta);

    if (record === null) {
      return null;
    }

    const pagos: readonly VentaHistoricoPago[] = record.pagos.map(
      (pago: VentaHistoricoPagoRecord): VentaHistoricoPago => ({
        tipoPagoPublicId: pago.tipoPagoPublicId,
        nombre: pago.nombre,
        importeCents: pago.importeCents,
        entregadoCents: pago.entregadoCents,
        cambioCents: pago.cambioCents,
      }),
    );

    const lineas: readonly VentaHistoricoLinea[] = record.lineas.map(
      (linea: VentaHistoricoLineaRecord): VentaHistoricoLinea => ({
        id: linea.id,
        localizador: linea.localizador,
        marca: linea.marca,
        descripcion: linea.descripcion,
        unidades: linea.unidades,
        pvpMicros: linea.pvpMicros,
        descuentoBps: linea.descuentoBps,
        importeDescuentoMicros: this.getLineaDescuentoMicros(linea),
        importeMicros: linea.importeMicros,
        regalo: linea.regalo,
      }),
    );

    let totalUnidades: number = 0;
    let totalDescuentoMicros: number = 0;

    for (const linea of record.lineas) {
      totalUnidades = this.safeAdd(
        totalUnidades,
        linea.unidades,
        'El total de unidades del histórico supera el rango numérico seguro.',
      );

      totalDescuentoMicros = this.safeAdd(
        totalDescuentoMicros,
        this.getLineaDescuentoMicros(linea),
        'El descuento total del histórico supera el rango numérico seguro.',
      );
    }

    return {
      id: record.id,
      publicId: record.publicId,
      serie: record.serie,
      numero: record.numero,
      fecha: record.fecha,
      empleadoNombre: record.empleadoNombre,
      cliente:
        record.cliente === null
          ? null
          : {
              publicId: record.cliente.publicId,
              nombre: record.cliente.nombre,
              email: record.cliente.email,
            },
      totalCents: record.totalCents,
      pagos,
      lineas,
      totalUnidades,
      totalDescuentoMicros,
      ticketBaiEstado: record.ticketBaiEstado,
      ticketBaiUltimoError: record.ticketBaiUltimoError,
      capacidades: {
        puedeCambiarCliente: true,
        puedeCambiarTipoPago:
          record.totalCents !== 0 && record.numeroPagos === 1 && record.cajaAbierta,
        puedeImprimirTicketRegalo: record.tieneLineasPositivas,
        puedeProcesarTicketBai: record.puedeProcesarTicketBai,
        puedeComprobarTicketBai: record.puedeComprobarTicketBai,
        puedeReintentarTicketBai: record.puedeReintentarTicketBai,
      },
    };
  }

  /**
   * Normaliza el filtro opcional de cliente.
   *
   * La ausencia del campo mantiene la consulta global del Histórico.
   */
  private normalizeClientePublicId(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('El identificador del cliente del histórico no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error('El identificador del cliente del histórico no es válido.');
    }

    return normalizedValue;
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
   * Convierte un periodo civil local inclusivo en un intervalo UTC [desde, hasta).
   */
  private toUtcPeriod(desde: LocalDateParts, hasta: LocalDateParts): UtcPeriod {
    const desdeDate: Date = this.createLocalMidnight(desde);
    const hastaExclusiveDate: Date = this.createLocalMidnight(hasta);

    /*
     * Se avanza un día en calendario local, no 24 horas absolutas.
     * Así los cambios de horario de verano mantienen el día civil correcto.
     */
    hastaExclusiveDate.setDate(hastaExclusiveDate.getDate() + 1);

    return {
      desde: desdeDate.toISOString(),
      hastaExclusive: hastaExclusiveDate.toISOString(),
    };
  }

  /**
   * Construye la medianoche de una fecha civil usando la zona horaria local del terminal.
   */
  private createLocalMidnight(parts: LocalDateParts): Date {
    const date: Date = new Date();

    date.setFullYear(parts.year, parts.month - 1, parts.day);
    date.setHours(0, 0, 0, 0);

    return date;
  }

  /**
   * Calcula el descuento económico efectivo de una línea histórica.
   *
   * Los regalos no se contabilizan como descuento. Para el resto
   * se compara el importe base teórico con el importe final persistido,
   * utilizando valores absolutos para soportar también devoluciones.
   */
  private getLineaDescuentoMicros(linea: VentaHistoricoLineaRecord): number {
    if (linea.regalo) {
      return 0;
    }

    const importeBaseMicros: number = linea.pvpMicros * linea.unidades;

    if (!Number.isSafeInteger(importeBaseMicros)) {
      throw new Error('El importe base de una línea histórica supera el rango numérico seguro.');
    }

    const importeDescuentoMicros: number = Math.max(
      0,
      Math.abs(importeBaseMicros) - Math.abs(linea.importeMicros),
    );

    if (!Number.isSafeInteger(importeDescuentoMicros)) {
      throw new Error('El descuento de una línea histórica supera el rango numérico seguro.');
    }

    return importeDescuentoMicros;
  }

  /**
   * Suma dos enteros y garantiza que el resultado siga siendo un entero seguro.
   */
  private safeAdd(left: number, right: number, message: string): number {
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
      throw new Error(message);
    }

    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }
}
