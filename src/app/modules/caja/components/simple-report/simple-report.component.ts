import { CurrencyPipe } from '@angular/common';
import { Component, input, type InputSignal } from '@angular/core';
import type {
  InformeSimpleImporteTipoPago,
  InformeSimpleItem,
  InformeSimpleResultado,
  InformeSimpleTicket,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import { formatMonthName } from '@utils/date.utils';

const WEEKDAY_FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
});

/**
 * Presenta el resultado del Informe Simple
 * de Caja.
 */
@Component({
  selector: 'otpv-simple-report',
  templateUrl: './simple-report.component.html',
  styleUrl: './simple-report.component.scss',
  imports: [CurrencyPipe, CentsToEurosPipe],
})
export default class SimpleReportComponent {
  readonly result: InputSignal<InformeSimpleResultado> = input.required<InformeSimpleResultado>();

  /**
   * Devuelve la etiqueta temporal de una fila.
   */
  getRowLabel(item: InformeSimpleItem): string {
    if (item.day === null) {
      return formatMonthName(item.month);
    }

    const date: Date = this.createLocalDate(item.year, item.month, item.day);

    return `${item.day} ${this.capitalize(WEEKDAY_FORMATTER.format(date))}`;
  }

  /**
   * Formatea el rango de tickets mostrado
   * en una fila o en el total del informe.
   */
  getTicketRange(first: InformeSimpleTicket | null, last: InformeSimpleTicket | null): string {
    if (first === null || last === null) {
      return '------';
    }

    return `${this.formatTicket(first)} - ${this.formatTicket(last)}`;
  }

  /**
   * Obtiene el importe correspondiente a un tipo
   * de pago concreto dentro de una fila.
   */
  getTipoPagoImporte(
    importes: readonly InformeSimpleImporteTipoPago[],
    tipoPagoPublicId: string,
  ): number {
    return (
      importes.find(
        (importe: InformeSimpleImporteTipoPago): boolean =>
          importe.tipoPagoPublicId === tipoPagoPublicId,
      )?.importeCents ?? 0
    );
  }

  /**
   * Construye una fecha civil local segura
   * para obtener nombres de meses y semana.
   */
  private createLocalDate(year: number, month: number, day: number): Date {
    const date: Date = new Date();

    date.setFullYear(year, month - 1, day);

    /*
     * El mediodía evita cualquier borde relacionado
     * con cambios horarios alrededor de medianoche.
     */
    date.setHours(12, 0, 0, 0);

    return date;
  }

  /**
   * Devuelve la representación visible
   * de una referencia de ticket.
   */
  private formatTicket(ticket: InformeSimpleTicket): string {
    const serie: string = ticket.serie.trim();

    return serie === '' ? String(ticket.numero) : `${serie}-${ticket.numero}`;
  }

  /**
   * Convierte la primera letra de un texto
   * a mayúscula conservando el resto.
   */
  private capitalize(value: string): string {
    if (value.length === 0) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
