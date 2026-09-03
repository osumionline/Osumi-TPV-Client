import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  signal,
  type InputSignal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import type {
  VentaHistoricoResumen,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import VentasHistoricoService from '@services/ventas-historico.service';
import { getErrorMessage } from '@utils/error.utils';

interface ClientSalesPeriod {
  readonly desde: string;
  readonly hasta: string;
}

/**
 * Muestra las ventas históricas asociadas a un cliente persistido.
 *
 * Es una sección exclusivamente documental y no modifica
 * el draft editable de la ficha.
 */
@Component({
  selector: 'otpv-client-sales',
  templateUrl: './client-sales.component.html',
  styleUrl: './client-sales.component.scss',
  imports: [CurrencyPipe, DatePipe, MatButton, CentsToEurosPipe],
})
export default class ClientSalesComponent implements OnInit {
  private readonly ventasHistoricoService: VentasHistoricoService = inject(VentasHistoricoService);

  readonly clientePublicId: InputSignal<string> = input.required<string>();
  readonly disabled: InputSignal<boolean> = input<boolean>(false);

  readonly desde: WritableSignal<string> = signal<string>('');
  readonly hasta: WritableSignal<string> = signal<string>('');
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly resultado: WritableSignal<VentasHistoricoResultado | null> =
    signal<VentasHistoricoResultado | null>(null);

  readonly ventas: Signal<readonly VentaHistoricoResumen[]> = computed(
    (): readonly VentaHistoricoResumen[] => this.resultado()?.ventas ?? [],
  );

  readonly invalidRange: Signal<boolean> = computed((): boolean => {
    const desde: string = this.desde();
    const hasta: string = this.hasta();

    return desde.length > 0 && hasta.length > 0 && desde > hasta;
  });

  readonly canSearch: Signal<boolean> = computed(
    (): boolean => this.desde().length > 0 && this.hasta().length > 0 && !this.invalidRange(),
  );

  private loadRequestId: number = 0;

  /**
   * Inicializa un periodo visible correspondiente al mes actual
   * y carga las ventas asociadas al cliente.
   */
  ngOnInit(): void {
    const period: ClientSalesPeriod = this.getCurrentMonthPeriod();

    this.desde.set(period.desde);
    this.hasta.set(period.hasta);

    void this.load();
  }

  /**
   * Actualiza la fecha inicial sin lanzar todavía la consulta.
   */
  onDesdeChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.desde.set(input.value);
    this.error.set(null);
  }

  /**
   * Actualiza la fecha final sin lanzar todavía la consulta.
   */
  onHastaChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.hasta.set(input.value);
    this.error.set(null);
  }

  /**
   * Consulta el periodo temporal mostrado en los filtros.
   */
  async search(): Promise<void> {
    if (this.disabled() || this.loading() || !this.canSearch()) {
      return;
    }

    await this.load();
  }

  /**
   * Construye la referencia documental visible de una venta.
   */
  getVentaReferencia(venta: VentaHistoricoResumen): string {
    return `${venta.serie}${venta.numero}`;
  }

  /**
   * Construye el texto compacto de los medios de pago de una venta.
   */
  getPagosLabel(venta: VentaHistoricoResumen): string {
    if (venta.pagos.length === 0) {
      return 'Sin pago';
    }

    return venta.pagos.map((pago): string => pago.nombre).join(' + ');
  }

  /**
   * Recupera el listado evitando que una respuesta antigua
   * sobrescriba una consulta posterior.
   */
  private async load(): Promise<void> {
    const requestId: number = ++this.loadRequestId;

    this.loading.set(true);
    this.error.set(null);
    this.resultado.set(null);

    try {
      const resultado: VentasHistoricoResultado = await this.ventasHistoricoService.getHistorico({
        desde: this.desde(),
        hasta: this.hasta(),
        clientePublicId: this.clientePublicId(),
      });

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.resultado.set(resultado);
    } catch (error: unknown) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.error.set(getErrorMessage(error, 'No se han podido recuperar las ventas del cliente.'));
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Obtiene el primer y último día del mes local actual.
   */
  private getCurrentMonthPeriod(): ClientSalesPeriod {
    const today: Date = new Date();
    const firstDay: Date = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay: Date = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      desde: this.formatLocalDate(firstDay),
      hasta: this.formatLocalDate(lastDay),
    };
  }

  /**
   * Formatea una fecha local sin convertirla a UTC.
   */
  private formatLocalDate(date: Date): string {
    const year: string = String(date.getFullYear());
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
