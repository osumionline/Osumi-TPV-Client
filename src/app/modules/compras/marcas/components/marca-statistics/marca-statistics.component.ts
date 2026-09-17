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
import { MONTH_OPTIONS, type MonthOption } from '@constants/date.constants';
import type {
  MarcaEstadisticasPoint,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/compras/marcas/marca-estadisticas.interface';
import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import MarcasService from '@services/compras/marcas.service';
import { formatShortMonthName } from '@utils/date.utils';
import { getErrorMessage } from '@utils/error.utils';
import { formatEuros, formatInteger } from '@utils/format.utils';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/**
 * Muestra las estadísticas históricas de ventas
 * correspondientes a una Marca persistida.
 */
@Component({
  selector: 'otpv-marca-statistics',
  templateUrl: './marca-statistics.component.html',
  styleUrl: './marca-statistics.component.scss',
  imports: [MatButton, MatOption, MatSelect, NgxEchartsDirective],
  providers: [
    provideEchartsCore({
      echarts,
    }),
  ],
})
export default class MarcaStatisticsComponent implements OnInit {
  private readonly marcasService: MarcasService = inject(MarcasService);

  private requestSequence: number = 0;

  readonly workspace: InputSignal<MarcaWorkspace> = input.required<MarcaWorkspace>();

  readonly result: WritableSignal<MarcaEstadisticasResultado | null> =
    signal<MarcaEstadisticasResultado | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly months: readonly MonthOption[] = MONTH_OPTIONS;

  readonly filters: Signal<MarcaEstadisticasFiltros> = computed(
    (): MarcaEstadisticasFiltros => this.workspace().estadisticasFiltros,
  );

  readonly yearOptions: Signal<readonly number[]> = computed((): readonly number[] => {
    const years: Set<number> = new Set<number>(this.result()?.availableYears ?? []);

    years.add(new Date().getFullYear());

    const currentYear: number | 'all' = this.filters().anio;

    if (currentYear !== 'all') {
      years.add(currentYear);
    }

    return [...years].sort((left: number, right: number): number => right - left);
  });

  readonly chartOptions: Signal<EChartsCoreOption> = computed((): EChartsCoreOption =>
    this.createChartOptions(),
  );

  readonly noSales: Signal<boolean> = computed((): boolean => {
    const result: MarcaEstadisticasResultado | null = this.result();

    return (
      result !== null &&
      result.points.every((point: MarcaEstadisticasPoint): boolean => point.value === 0)
    );
  });

  /**
   * Carga las estadísticas correspondientes a los
   * filtros conservados actualmente en el workspace.
   */
  ngOnInit(): void {
    void this.load(this.workspace());
  }

  /**
   * Cambia el mes de las estadísticas.
   */
  onMonthChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== 'all' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 12)
    ) {
      return;
    }

    this.applyFilters({
      ...this.filters(),
      mes: value,
    });
  }

  /**
   * Cambia el año de las estadísticas.
   */
  onYearChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (
      value !== 'all' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 9999)
    ) {
      return;
    }

    this.applyFilters({
      ...this.filters(),
      anio: value,
      mes: value === 'all' ? 'all' : this.filters().mes,
    });
  }

  /**
   * Cambia la magnitud mostrada.
   */
  onTipoChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (value !== 'amount' && value !== 'units') {
      return;
    }

    this.applyFilters({
      ...this.filters(),
      tipo: value,
    });
  }

  /**
   * Reintenta la última consulta fallida.
   */
  retry(): void {
    void this.load(this.workspace());
  }

  /**
   * Formatea el total correspondiente al
   * período actualmente representado.
   */
  formatTotal(): string {
    const result: MarcaEstadisticasResultado | null = this.result();

    if (result === null) {
      return '—';
    }

    if (result.tipo === 'amount') {
      return formatEuros(this.microsToEuros(result.total));
    }

    return `${formatInteger(result.total)} unidades`;
  }

  /**
   * Actualiza los filtros persistidos en workspace
   * y solicita inmediatamente la nueva serie.
   */
  private applyFilters(filters: MarcaEstadisticasFiltros): void {
    const workspace: MarcaWorkspace = this.marcasService.actualizarFiltrosEstadisticas(filters);

    void this.load(workspace);
  }

  /**
   * Recupera la estadística correspondiente
   * al workspace indicado.
   */
  private async load(workspace: MarcaWorkspace): Promise<void> {
    if (workspace.marcaId === null) {
      return;
    }

    const requestId: number = ++this.requestSequence;

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: MarcaEstadisticasResultado = await this.marcasService.getEstadisticas(
        workspace.marcaId,
        workspace.estadisticasFiltros,
      );

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
        getErrorMessage(error, 'No se han podido cargar las estadísticas de la marca.'),
      );
    } finally {
      if (requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Construye las opciones de ECharts para
   * la serie temporal actualmente cargada.
   */
  private createChartOptions(): EChartsCoreOption {
    const result: MarcaEstadisticasResultado | null = this.result();

    const points: readonly MarcaEstadisticasPoint[] = result?.points ?? [];

    const labels: readonly string[] = points.map((point: MarcaEstadisticasPoint): string =>
      this.formatPointLabel(point),
    );

    const amount: boolean = (result?.tipo ?? this.filters().tipo) === 'amount';

    const values: readonly number[] = points.map((point: MarcaEstadisticasPoint): number =>
      amount ? this.microsToEuros(point.value) : point.value,
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
        valueFormatter: (value: unknown): string => this.formatTooltipValue(value, amount),
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
   * Convierte un punto estadístico en
   * la etiqueta correspondiente del eje.
   */
  private formatPointLabel(point: MarcaEstadisticasPoint): string {
    if (point.day !== null && point.month !== null) {
      return `${point.day} ${formatShortMonthName(point.month)}`;
    }

    if (point.month !== null) {
      return formatShortMonthName(point.month);
    }

    return String(point.year);
  }

  /**
   * Convierte microeuros a euros únicamente
   * en la frontera de presentación.
   */
  private microsToEuros(value: number): number {
    return value / 1_000_000;
  }

  /**
   * Formatea un valor de tooltip según
   * la magnitud actualmente representada.
   */
  private formatTooltipValue(value: unknown, amount: boolean): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '';
    }

    if (amount) {
      return formatEuros(value);
    }

    return `${formatInteger(value)} unidades`;
  }
}
