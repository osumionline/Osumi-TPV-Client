import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import type {
  ArticuloEstadisticasPoint,
  ArticuloEstadisticasResultado,
  ArticuloEstadisticasTipo,
} from '@desktop-contracts/articulos/articulo-estadisticas.interface';
import { rescaleScaledInteger } from '@model/articulos/articulo-scaled-decimal.utils';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticulosService from '@services/articulos.service';
import { getErrorMessage } from '@utils/error.utils';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

interface MonthOption {
  readonly value: number;
  readonly label: string;
}

const MONTHS: readonly MonthOption[] = [
  {
    value: 1,
    label: 'Enero',
  },
  {
    value: 2,
    label: 'Febrero',
  },
  {
    value: 3,
    label: 'Marzo',
  },
  {
    value: 4,
    label: 'Abril',
  },
  {
    value: 5,
    label: 'Mayo',
  },
  {
    value: 6,
    label: 'Junio',
  },
  {
    value: 7,
    label: 'Julio',
  },
  {
    value: 8,
    label: 'Agosto',
  },
  {
    value: 9,
    label: 'Septiembre',
  },
  {
    value: 10,
    label: 'Octubre',
  },
  {
    value: 11,
    label: 'Noviembre',
  },
  {
    value: 12,
    label: 'Diciembre',
  },
];

const SHORT_MONTHS: readonly string[] = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const UNITS_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/**
 * Muestra las estadísticas históricas de ventas
 * correspondientes a un artículo persistido.
 */
@Component({
  selector: 'otpv-article-statistics',
  templateUrl: './article-statistics.component.html',
  styleUrl: './article-statistics.component.scss',
  imports: [MatButton, MatOption, MatSelect, NgxEchartsDirective],
  providers: [
    provideEchartsCore({
      echarts,
    }),
  ],
})
export default class ArticleStatisticsComponent implements OnInit {
  private readonly articulosService: ArticulosService = inject(ArticulosService);

  private requestSequence: number = 0;

  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();

  readonly tipo: WritableSignal<ArticuloEstadisticasTipo> =
    signal<ArticuloEstadisticasTipo>('unidades');

  readonly month: WritableSignal<number | null> = signal<number | null>(null);

  readonly year: WritableSignal<number | null> = signal<number | null>(new Date().getFullYear());

  readonly result: WritableSignal<ArticuloEstadisticasResultado | null> =
    signal<ArticuloEstadisticasResultado | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly months: readonly MonthOption[] = MONTHS;

  readonly yearOptions: Signal<readonly number[]> = computed((): readonly number[] => {
    const years: Set<number> = new Set<number>(this.result()?.availableYears ?? []);

    const currentYear: number | null = this.year();

    if (currentYear !== null) {
      years.add(currentYear);
    }

    return [...years].sort((left: number, right: number): number => right - left);
  });

  readonly chartOptions: Signal<EChartsCoreOption> = computed((): EChartsCoreOption =>
    this.createChartOptions(),
  );

  readonly noNetSales: Signal<boolean> = computed((): boolean => {
    const result: ArticuloEstadisticasResultado | null = this.result();

    return (
      result !== null &&
      result.points.every((point: ArticuloEstadisticasPoint): boolean => point.value === 0)
    );
  });

  /**
   * Carga las estadísticas iniciales del año actual.
   */
  ngOnInit(): void {
    if (this.tab().draft.id !== null) {
      void this.load();
    }
  }

  /**
   * Cambia la magnitud mostrada por la gráfica.
   */
  onTipoChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (value !== 'unidades' && value !== 'importe') {
      return;
    }

    this.tipo.set(value);
    void this.load();
  }

  /**
   * Cambia el mes utilizado para la agregación.
   */
  onMonthChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== null &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 12)
    ) {
      return;
    }

    this.month.set(value);
    void this.load();
  }

  /**
   * Cambia el año utilizado para la agregación.
   */
  onYearChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== null &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    ) {
      return;
    }

    this.year.set(value);
    void this.load();
  }

  /**
   * Vuelve a solicitar los datos tras un error.
   */
  retry(): void {
    void this.load();
  }

  /**
   * Formatea el total correspondiente a la selección.
   */
  formatTotal(): string {
    const result: ArticuloEstadisticasResultado | null = this.result();

    if (result === null) {
      return '—';
    }

    if (result.tipo === 'importe') {
      return CURRENCY_FORMATTER.format(this.microsToEuros(result.total));
    }

    return `${UNITS_FORMATTER.format(result.total)} unidades`;
  }

  /**
   * Recupera las estadísticas asociadas a los
   * tres filtros actualmente seleccionados.
   */
  private async load(): Promise<void> {
    const idArticulo: number | null = this.tab().draft.id;

    if (idArticulo === null) {
      return;
    }

    const requestId: number = ++this.requestSequence;

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: ArticuloEstadisticasResultado = await this.articulosService.getEstadisticas({
        idArticulo,
        tipo: this.tipo(),
        year: this.year(),
        month: this.month(),
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      this.result.set(result);
    } catch (error: unknown) {
      if (requestId !== this.requestSequence) {
        return;
      }

      this.result.set(null);
      this.error.set(
        getErrorMessage(error, 'No se han podido cargar las estadísticas del artículo.'),
      );
    } finally {
      if (requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Construye las opciones actuales de ECharts.
   */
  private createChartOptions(): EChartsCoreOption {
    const result: ArticuloEstadisticasResultado | null = this.result();

    const points: readonly ArticuloEstadisticasPoint[] = result?.points ?? [];

    const labels: readonly string[] = points.map((point: ArticuloEstadisticasPoint): string =>
      this.formatPointLabel(point),
    );

    const values: readonly number[] = points.map((point: ArticuloEstadisticasPoint): number =>
      this.toChartValue(point.value),
    );

    const amount: boolean = this.tipo() === 'importe';

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
        minInterval: amount ? undefined : 1,
        axisLabel: amount
          ? {
              formatter: '{value} €',
            }
          : undefined,
      },
      series: [
        {
          name: amount ? 'Importe' : 'Unidades',
          type: 'bar',
          data: values,
          barMaxWidth: 44,
        },
      ],
    };
  }

  /**
   * Convierte un punto temporal en su etiqueta de eje.
   */
  private formatPointLabel(point: ArticuloEstadisticasPoint): string {
    const shortMonth: string = SHORT_MONTHS[point.month - 1] ?? String(point.month);

    if (point.day !== null) {
      return `${point.day} ${shortMonth}`;
    }

    if (this.year() === null && this.month() !== null) {
      return String(point.year);
    }

    if (this.year() === null) {
      return `${shortMonth} ${point.year}`;
    }

    return shortMonth;
  }

  /**
   * Convierte el valor de dominio a la escala
   * exclusivamente visual utilizada por la gráfica.
   */
  private toChartValue(value: number): number {
    if (this.tipo() === 'unidades') {
      return value;
    }

    return this.microsToEuros(value);
  }

  /**
   * Convierte microeuros a euros únicamente
   * en la frontera de presentación.
   */
  private microsToEuros(value: number): number {
    const cents: number = rescaleScaledInteger(value, 6, 2);

    return cents / 100;
  }

  /**
   * Formatea el valor mostrado por el tooltip.
   */
  private formatTooltipValue(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '';
    }

    if (this.tipo() === 'importe') {
      return CURRENCY_FORMATTER.format(value);
    }

    return `${UNITS_FORMATTER.format(value)} unidades`;
  }
}
