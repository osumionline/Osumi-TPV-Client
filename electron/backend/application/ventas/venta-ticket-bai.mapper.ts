import type {
  TicketBaiCreateInvoiceRequest,
  TicketBaiInvoiceLine,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';

const TICKET_BAI_SERIES: string = 'TPV01';

const MICROS_PER_EURO: number = 1_000_000;

const BPS_PER_PERCENT: number = 100;

const ROUND_FACTOR: number = 10_000;

export default class VentaTicketBaiMapper {
  /**
   * Construye el payload fiscal ordinario
   * desde el snapshot releído después del COMMIT.
   */
  map(ticket: VentaTicketInterface): TicketBaiCreateInvoiceRequest {
    this.validateTicket(ticket);

    const date: Date = new Date(ticket.fecha);

    if (Number.isNaN(date.getTime())) {
      throw new Error('La fecha de la venta no es válida para TicketBAI.');
    }

    return {
      fecha: this.formatLocalDate(date),
      hora: this.formatLocalTime(date),
      simplificada: true,
      serie: TICKET_BAI_SERIES,
      numero: String(ticket.numero).padStart(6, '0'),
      rectificativa: false,
      retencion: 0,
      modoRecargoEquivalencia: true,
      lineas: this.mapLineas(ticket.lineas),
      totalFactura: this.centsToEuros(ticket.totalCents),
    };
  }

  /**
   * Rechaza operaciones que todavía pertenecen
   * al bloque fiscal de devoluciones/mixtas.
   */
  private validateTicket(ticket: VentaTicketInterface): void {
    if (!Number.isSafeInteger(ticket.numero) || ticket.numero <= 0) {
      throw new Error('El número de venta no es válido para TicketBAI.');
    }

    if (!Number.isSafeInteger(ticket.totalCents) || ticket.totalCents < 0) {
      throw new Error(['La operación no pertenece al flujo', 'TicketBAI ordinario.'].join(' '));
    }

    if (ticket.lineas.length === 0) {
      throw new Error('La venta no contiene líneas para TicketBAI.');
    }
  }

  /**
   * Convierte las líneas persistidas en líneas fiscales,
   * añadiendo una segunda línea negativa cuando existe
   * descuento económico efectivo.
   */
  private mapLineas(lineas: readonly VentaTicketLineaInterface[]): readonly TicketBaiInvoiceLine[] {
    const result: TicketBaiInvoiceLine[] = [];

    for (const linea of lineas) {
      this.validateLinea(linea);

      result.push(this.createMainLine(linea));

      const discountLine: TicketBaiInvoiceLine | null = this.createDiscountLine(linea);

      if (discountLine !== null) {
        result.push(discountLine);
      }
    }

    return result;
  }

  /**
   * Valida que una línea pueda tratarse todavía
   * como parte de una venta ordinaria.
   */
  private validateLinea(linea: VentaTicketLineaInterface): void {
    if (
      !Number.isSafeInteger(linea.unidades) ||
      linea.unidades <= 0 ||
      !Number.isSafeInteger(linea.pvpMicros) ||
      linea.pvpMicros < 0 ||
      !Number.isSafeInteger(linea.importeMicros) ||
      linea.importeMicros < 0 ||
      !Number.isSafeInteger(linea.ivaBps) ||
      linea.ivaBps < 0 ||
      linea.ivaBps > 10_000
    ) {
      throw new Error(['Una línea no pertenece al flujo', 'TicketBAI ordinario.'].join(' '));
    }

    const theoreticalMicros: number = linea.pvpMicros * linea.unidades;

    if (!Number.isSafeInteger(theoreticalMicros) || linea.importeMicros > theoreticalMicros) {
      throw new Error('El importe de una línea no es válido para TicketBAI.');
    }

    if (linea.nombre.trim() === '') {
      throw new Error('Una línea de TicketBAI no puede tener una descripción vacía.');
    }
  }

  /**
   * Construye la línea positiva del artículo
   * usando el precio unitario sin IVA.
   */
  private createMainLine(linea: VentaTicketLineaInterface): TicketBaiInvoiceLine {
    const ivaPercent: number = this.bpsToPercent(linea.ivaBps);

    const grossUnitEuros: number = this.microsToEuros(linea.pvpMicros);

    return {
      descripcion: linea.nombre.trim(),
      cantidad: linea.unidades,
      importeUnitario: this.removeVat(grossUnitEuros, ivaPercent),
      tipoIva: ivaPercent,
      tipoReq: 0,
    };
  }

  /**
   * Construye la línea negativa de descuento
   * a partir del resultado económico persistido.
   *
   * Esto cubre de forma uniforme porcentajes,
   * importes fijos y regalos.
   */
  private createDiscountLine(linea: VentaTicketLineaInterface): TicketBaiInvoiceLine | null {
    const theoreticalMicros: number = linea.pvpMicros * linea.unidades;

    const discountMicros: number = theoreticalMicros - linea.importeMicros;

    if (discountMicros === 0) {
      return null;
    }

    const grossDiscountPerUnitEuros: number = this.microsToEuros(discountMicros) / linea.unidades;

    const ivaPercent: number = this.bpsToPercent(linea.ivaBps);

    return {
      descripcion: `Descuento - ${linea.nombre.trim()}`,
      cantidad: linea.unidades,
      importeUnitario: -this.removeVat(grossDiscountPerUnitEuros, ivaPercent),
      tipoIva: ivaPercent,
      tipoReq: 0,
    };
  }

  /**
   * Elimina el IVA de un importe unitario
   * y reproduce el redondeo fiscal a 4 decimales.
   */
  private removeVat(grossEuros: number, ivaPercent: number): number {
    const divisor: number = 1 + ivaPercent / 100;

    return this.roundFourDecimals(grossEuros / divisor);
  }

  /**
   * Convierte basis points en porcentaje decimal.
   */
  private bpsToPercent(bps: number): number {
    return bps / BPS_PER_PERCENT;
  }

  /**
   * Convierte microeuros en euros.
   */
  private microsToEuros(micros: number): number {
    return micros / MICROS_PER_EURO;
  }

  /**
   * Convierte céntimos en euros.
   */
  private centsToEuros(cents: number): number {
    return cents / 100;
  }

  /**
   * Redondea simétricamente a cuatro decimales.
   */
  private roundFourDecimals(value: number): number {
    const sign: number = value < 0 ? -1 : 1;

    return (sign * Math.round(Math.abs(value) * ROUND_FACTOR + Number.EPSILON)) / ROUND_FACTOR;
  }

  /**
   * Formatea la fecha civil local como dd/mm/yyyy.
   */
  private formatLocalDate(date: Date): string {
    const day: string = String(date.getDate()).padStart(2, '0');

    const month: string = String(date.getMonth() + 1).padStart(2, '0');

    const year: string = String(date.getFullYear());

    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea la hora local como HH:mm:ss.
   */
  private formatLocalTime(date: Date): string {
    const hours: string = String(date.getHours()).padStart(2, '0');

    const minutes: string = String(date.getMinutes()).padStart(2, '0');

    const seconds: string = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
}
