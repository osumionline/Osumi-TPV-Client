import {
  Component,
  computed,
  inject,
  input,
  signal,
  type InputSignal,
  type OnDestroy,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import type {
  ClienteConsumoMensualPoint,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import ClientesService from '@services/clientes.service';
import { getErrorMessage } from '@utils/error.utils';
import { microsToEuros } from '@utils/money.utils';
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

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/**
 * Muestra la evolución temporal del consumo real
 * correspondiente a un cliente persistido.
 */
@Component({
  selector: 'otpv-client-monthly-consumption',
  templateUrl: './client-monthly-consumption.component.html',
  styleUrl: './client-monthly-consumption.component.scss',
  imports: [MatButton, MatOption, MatSelect, NgxEchartsDirective],
  providers: [
    provideEchartsCore({
      echarts,
    }),
  ],
})
export default class ClientMonthlyConsumptionComponent implements OnInit, OnDestroy {
  private readonly clientesService: ClientesService = inject(ClientesService);

  private requestSequence: number = 0;

  readonly clientePublicId: InputSignal<string> = input.required<string>();

  readonly month: WritableSignal<number | null> = signal<number | null>(null);

  readonly year: WritableSignal<number | null> = signal<number | null>(new Date().getFullYear());

  readonly result: WritableSignal<ClienteConsumoMensualResultado | null> =
    signal<ClienteConsumoMensualResultado | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly months: readonly MonthOption[] = MONTHS;

  readonly yearOptions: Signal<readonly number[]> = computed((): readonly number[] => {
    const years: Set<number> = new Set<number>(this.result()?.availableYears ?? []);
    const selectedYear: number | null = this.year();

    if (selectedYear !== null) {
      years.add(selectedYear);
    }

    return [...years].sort((left: number, right: number): number => right - left);
  });

  readonly chartOptions: Signal<EChartsCoreOption> = computed((): EChartsCoreOption =>
    this.createChartOptions(),
  );

  readonly noConsumption: Signal<boolean> = computed((): boolean => {
    const result: ClienteConsumoMensualResultado | null = this.result();

    return (
      result !== null &&
      result.points.every((point: ClienteConsumoMensualPoint): boolean => point.importeMicros === 0)
    );
  });

  /**
   * Carga inicialmente el año actual completo.
   */
  ngOnInit(): void {
    void this.load();
  }

  /**
   * Invalida cualquier respuesta pendiente al destruir el componente.
   */
  ngOnDestroy(): void {
    this.requestSequence += 1;
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
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 9999)
    ) {
      return;
    }

    this.year.set(value);
    void this.load();
  }

  /**
   * Reintenta la consulta después de un error.
   */
  retry(): void {
    void this.load();
  }

  /**
   * Formatea el consumo total del período seleccionado.
   */
  formatTotal(): string {
    const result: ClienteConsumoMensualResultado | null = this.result();

    if (result === null) {
      return '—';
    }

    return CURRENCY_FORMATTER.format(microsToEuros(result.totalMicros));
  }

  /**
   * Recupera el consumo correspondiente a los filtros actuales.
   */
  private async load(): Promise<void> {
    const requestId: number = ++this.requestSequence;

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: ClienteConsumoMensualResultado = await this.clientesService.getConsumoMensual({
        clientePublicId: this.clientePublicId(),
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
        getErrorMessage(error, 'No se ha podido cargar el consumo mensual del cliente.'),
      );
    } finally {
      if (requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Construye las opciones actuales de la gráfica.
   */
  private createChartOptions(): EChartsCoreOption {
    const points: readonly ClienteConsumoMensualPoint[] = this.result()?.points ?? [];

    const labels: readonly string[] = points.map((point: ClienteConsumoMensualPoint): string =>
      this.formatPointLabel(point),
    );

    const values: readonly number[] = points.map((point: ClienteConsumoMensualPoint): number =>
      microsToEuros(point.importeMicros),
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
          name: 'Consumo',
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
  private formatPointLabel(point: ClienteConsumoMensualPoint): string {
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
   * Formatea el valor monetario de un tooltip.
   */
  private formatTooltipValue(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '';
    }

    return CURRENCY_FORMATTER.format(value);
  }
}
