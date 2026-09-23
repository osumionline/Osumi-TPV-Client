import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input, type InputSignal } from '@angular/core';
import type { InformeDetalladoResultado } from '@desktop-contracts/caja/informes/informe-detallado.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import { bpsToPercent } from '@utils/percentage.utils';

const INTEGER_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const PERCENTAGE_POINT_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Presenta el resultado del Informe Detallado
 * de Caja en un formato preparado para impresión.
 */
@Component({
  selector: 'otpv-detailed-report',
  templateUrl: './detailed-report.component.html',
  styleUrl: './detailed-report.component.scss',
  imports: [BpsToPercentPipe, CurrencyPipe, DecimalPipe, MicrosToEurosPipe],
})
export default class DetailedReportComponent {
  readonly result: InputSignal<InformeDetalladoResultado> =
    input.required<InformeDetalladoResultado>();

  /**
   * Devuelve el símbolo visual correspondiente
   * al sentido de una comparativa.
   */
  getTrendSymbol(difference: number | null): string {
    if (difference === null || difference === 0) {
      return '=';
    }

    return difference > 0 ? '↑' : '↓';
  }

  /**
   * Formatea una diferencia entera añadiendo
   * signo positivo cuando corresponda.
   */
  formatIntegerDifference(difference: number): string {
    const formatted: string = INTEGER_FORMATTER.format(difference);

    return difference > 0 ? `+${formatted}` : formatted;
  }

  /**
   * Formatea una diferencia de margen
   * expresándola en puntos porcentuales.
   */
  formatMarginDifference(differenceBps: number | null): string {
    if (differenceBps === null) {
      return '—';
    }

    const value: number = bpsToPercent(differenceBps);

    const formatted: string = PERCENTAGE_POINT_FORMATTER.format(value);

    return value > 0 ? `+${formatted} p.p.` : `${formatted} p.p.`;
  }
}
