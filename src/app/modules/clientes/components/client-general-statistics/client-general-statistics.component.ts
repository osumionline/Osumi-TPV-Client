import { CurrencyPipe } from '@angular/common';
import {
  Component,
  inject,
  input,
  signal,
  type InputSignal,
  type OnDestroy,
  type OnInit,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';
import type { ClienteEstadisticasGeneralesInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import ClientMonthlyConsumptionComponent from '@modules/clientes/components/client-monthly-consumption/client-monthly-consumption.component';
import IsoDateToSpanishPipe from '@pipes/iso-date-to-spanish.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ClientesService from '@services/clientes.service';
import { getErrorMessage } from '@utils/error.utils';

const MONTH_NAMES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MARGIN_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Muestra las estadísticas históricas generales
 * de un cliente persistido.
 */
@Component({
  selector: 'otpv-client-general-statistics',
  templateUrl: './client-general-statistics.component.html',
  styleUrl: './client-general-statistics.component.scss',
  imports: [
    ClientMonthlyConsumptionComponent,
    CurrencyPipe,
    IsoDateToSpanishPipe,
    MatAccordion,
    MatButton,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MicrosToEurosPipe,
  ],
})
export default class ClientGeneralStatisticsComponent implements OnInit, OnDestroy {
  private readonly clientesService: ClientesService = inject(ClientesService);

  readonly clientePublicId: InputSignal<string> = input.required<string>();

  readonly result: WritableSignal<ClienteEstadisticasGeneralesInterface | null> =
    signal<ClienteEstadisticasGeneralesInterface | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private loadRequestId: number = 0;

  /**
   * Carga las estadísticas al entrar en la sección.
   */
  ngOnInit(): void {
    void this.load();
  }

  /**
   * Invalida cualquier respuesta pendiente al destruir el componente.
   */
  ngOnDestroy(): void {
    this.loadRequestId += 1;
  }

  /**
   * Reintenta la consulta después de un error.
   */
  retry(): void {
    void this.load();
  }

  /**
   * Obtiene el nombre en español de un mes.
   */
  getMonthName(month: number): string {
    return MONTH_NAMES[month - 1] ?? `Mes ${month}`;
  }

  /**
   * Formatea un margen almacenado como microporcentaje.
   */
  formatMargin(margenMicroporcentaje: number | null): string {
    if (margenMicroporcentaje === null) {
      return '—';
    }

    return `${MARGIN_FORMATTER.format(margenMicroporcentaje / 1_000_000)} %`;
  }

  /**
   * Recupera las estadísticas generales y descarta
   * cualquier respuesta perteneciente a una petición anterior.
   */
  private async load(): Promise<void> {
    const requestId: number = ++this.loadRequestId;

    this.result.set(null);
    this.loading.set(true);
    this.error.set(null);

    try {
      const result: ClienteEstadisticasGeneralesInterface =
        await this.clientesService.getEstadisticasGenerales(this.clientePublicId());

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.result.set(result);
    } catch (error: unknown) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.error.set(
        getErrorMessage(error, 'No se han podido cargar las estadísticas del cliente.'),
      );
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }
}
