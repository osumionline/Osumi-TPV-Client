import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import { MONTH_OPTIONS, type MonthOption } from '@constants/date.constants';
import type {
  TipoPagoEstadisticasPoint,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { formatShortMonthName } from '@utils/date.utils';
import { getErrorMessage } from '@utils/error.utils';
import { formatDecimal, formatEuros, formatInteger } from '@utils/format.utils';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

interface TipoPagoEstadisticasFiltros {
  readonly mes: number | 'all';
  readonly anio: number | 'all';
}

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/**
 * Muestra las estadísticas históricas
 * de un tipo de pago persistido.
 */
@Component({
  selector: 'otpv-payment-type-statistics',
  templateUrl: './payment-type-statistics.component.html',
  styleUrl: './payment-type-statistics.component.scss',
  imports: [MatButton, MatOption, MatSelect, MatIcon, NgxEchartsDirective],
  providers: [
    provideEchartsCore({
      echarts,
    }),
  ],
})
export default class PaymentTypeStatisticsComponent {
  private readonly tiposPagoService: TiposPagoService = inject(TiposPagoService);

  private requestSequence: number = 0;

  readonly tipoPago: InputSignal<TipoPago> = input.required<TipoPago>();

  readonly active: InputSignal<boolean> = input<boolean>(false);

  readonly result: WritableSignal<TipoPagoEstadisticasResultado | null> =
    signal<TipoPagoEstadisticasResultado | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly filters: WritableSignal<TipoPagoEstadisticasFiltros> =
    signal<TipoPagoEstadisticasFiltros>(createInitialFilters());

  readonly months: readonly MonthOption[] = MONTH_OPTIONS;

  readonly yearOptions: Signal<readonly number[]> = computed((): readonly number[] => {
    const years: Set<number> = new Set<number>(this.result()?.availableYears ?? []);

    years.add(new Date().getFullYear());

    const selectedYear: number | 'all' = this.filters().anio;

    if (selectedYear !== 'all') {
      years.add(selectedYear);
    }

    return [...years].sort((first: number, second: number): number => second - first);
  });

  readonly chartOptions: Signal<EChartsCoreOption> = computed((): EChartsCoreOption =>
    this.createChartOptions(),
  );

  readonly noActivity: Signal<boolean> = computed(
    (): boolean => this.result() !== null && this.result()?.operaciones === 0,
  );

  constructor() {
    effect((): void => {
      const active: boolean = this.active();

      const tipoPago: TipoPago = this.tipoPago();

      const filters: TipoPagoEstadisticasFiltros = this.filters();

      const requestId: number = ++this.requestSequence;

      if (!active || tipoPago.id === null) {
        return;
      }

      void this.load(tipoPago.id, filters, requestId);
    });
  }

  /**
   * Cambia el mes representado.
   */
  onMonthChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== 'all' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 12)
    ) {
      return;
    }

    this.filters.update((current: TipoPagoEstadisticasFiltros): TipoPagoEstadisticasFiltros => ({
      ...current,
      mes: value,
    }));
  }

  /**
   * Cambia el año representado.
   */
  onYearChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== 'all' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 9999)
    ) {
      return;
    }

    this.filters.update((current: TipoPagoEstadisticasFiltros): TipoPagoEstadisticasFiltros => ({
      anio: value,
      mes: value === 'all' ? 'all' : current.mes,
    }));
  }

  /**
   * Reintenta la consulta actual.
   */
  retry(): void {
    const tipoPago: TipoPago = this.tipoPago();

    if (!this.active() || tipoPago.id === null) {
      return;
    }

    const requestId: number = ++this.requestSequence;

    void this.load(tipoPago.id, this.filters(), requestId);
  }

  /**
   * Formatea el importe total.
   */
  formatTotal(): string {
    const result: TipoPagoEstadisticasResultado | null = this.result();

    return result === null ? '—' : formatEuros(result.totalImporteCents / 100);
  }

  /**
   * Formatea el número de operaciones.
   */
  formatOperations(): string {
    const result: TipoPagoEstadisticasResultado | null = this.result();

    return result === null ? '—' : formatInteger(result.operaciones);
  }

  /**
   * Formatea el importe medio
   * de cada operación.
   */
  formatAverage(): string {
    const result: TipoPagoEstadisticasResultado | null = this.result();

    return result === null ? '—' : formatEuros(result.importeMedioCents / 100);
  }

  /**
   * Formatea el porcentaje sobre
   * el total de cobros del período.
   */
  formatPercentage(): string {
    const result: TipoPagoEstadisticasResultado | null = this.result();

    return result === null ? '—' : `${formatDecimal(result.porcentajeTotalBps / 100)} %`;
  }

  /**
   * Recupera las estadísticas solicitadas
   * ignorando respuestas ya obsoletas.
   */
  private async load(
    idTipoPago: number,
    filters: TipoPagoEstadisticasFiltros,
    requestId: number,
  ): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const result: TipoPagoEstadisticasResultado = await this.tiposPagoService.getEstadisticas({
        idTipoPago,
        year: filters.anio === 'all' ? null : filters.anio,
        month: filters.mes === 'all' ? null : filters.mes,
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      this.result.set(result);
    } catch (error: unknown) {
      if (requestId !== this.requestSequence) {
        return;
      }

      this.error.set(
        getErrorMessage(error, 'No se han podido cargar las estadísticas del tipo de pago.'),
      );
    } finally {
      if (requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Construye el gráfico de evolución
   * del importe neto cobrado.
   */
  private createChartOptions(): EChartsCoreOption {
    const points: readonly TipoPagoEstadisticasPoint[] = this.result()?.points ?? [];

    const labels: readonly string[] = points.map((point: TipoPagoEstadisticasPoint): string =>
      this.formatPointLabel(point),
    );

    const values: readonly number[] = points.map(
      (point: TipoPagoEstadisticasPoint): number => point.importeCents / 100,
    );

    return {
      animationDuration: 250,

      grid: {
        top: 14,
        right: 20,
        bottom: labels.length > 16 ? 58 : 32,
        left: 20,
        containLabel: true,
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        valueFormatter: (value: unknown): string => this.formatTooltipValue(value),
      },

      xAxis: {
        type: 'category',
        data: labels,
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          interval: 0,
          rotate: labels.length > 16 ? 45 : 0,
        },
      },

      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value} €',
        },
      },

      series: [
        {
          name: 'Importe',
          type: 'bar',
          data: values,
          barMaxWidth: 44,
        },
      ],
    };
  }

  /**
   * Genera la etiqueta temporal
   * correspondiente a un punto.
   */
  private formatPointLabel(point: TipoPagoEstadisticasPoint): string {
    if (point.day !== null && point.month !== null) {
      return `${point.day} ${formatShortMonthName(point.month)}`;
    }

    if (point.month !== null) {
      return formatShortMonthName(point.month);
    }

    return String(point.year);
  }

  /**
   * Formatea el importe mostrado
   * por el tooltip del gráfico.
   */
  private formatTooltipValue(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '';
    }

    return formatEuros(value);
  }
}

/**
 * Crea el período inicial usando
 * el mes y el año actuales.
 */
function createInitialFilters(now: Date = new Date()): TipoPagoEstadisticasFiltros {
  return {
    mes: now.getMonth() + 1,
    anio: now.getFullYear(),
  };
}
