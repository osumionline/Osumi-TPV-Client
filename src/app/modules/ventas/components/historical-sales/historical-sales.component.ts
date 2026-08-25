import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type {
  ResumenHistorico,
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentaHistoricoResumen,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import HistoricalSaleDetailComponent from '@modules/ventas/components/historical-sale-detail/historical-sale-detail.component';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import VentasHistoricoService from '@services/ventas-historico.service';
import { getErrorMessage } from '@utils/error.utils';

type HistoricalSalesTab = 'ventas' | 'salidas-caja';

type HistoricalSalesFilterMode = 'fecha' | 'rango';

/**
 * Muestra el Histórico disponible desde el workspace de Ventas.
 */
@Component({
  selector: 'otpv-historical-sales',
  templateUrl: './historical-sales.component.html',
  styleUrl: './historical-sales.component.scss',
  imports: [
    HistoricalSaleDetailComponent,
    CurrencyPipe,
    DatePipe,
    MatButton,
    MatIcon,
    MatIconButton,
    MatTooltip,
    CentsToEurosPipe,
  ],
})
export default class HistoricalSalesComponent implements AfterViewInit, OnInit {
  private readonly ventasHistoricoService: VentasHistoricoService = inject(VentasHistoricoService);

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly activeTab: WritableSignal<HistoricalSalesTab> = signal<HistoricalSalesTab>('ventas');

  readonly filterMode: WritableSignal<HistoricalSalesFilterMode> =
    signal<HistoricalSalesFilterMode>('fecha');

  readonly fecha: WritableSignal<string> = signal<string>('');
  readonly desde: WritableSignal<string> = signal<string>('');
  readonly hasta: WritableSignal<string> = signal<string>('');

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly resultado: WritableSignal<VentasHistoricoResultado | null> =
    signal<VentasHistoricoResultado | null>(null);

  readonly selectedVentaId: WritableSignal<number | null> = signal<number | null>(null);

  readonly detalleLoading: WritableSignal<boolean> = signal<boolean>(false);

  readonly detalleError: WritableSignal<string | null> = signal<string | null>(null);

  readonly detalle: WritableSignal<VentaHistoricoDetalle | null> =
    signal<VentaHistoricoDetalle | null>(null);

  readonly ventas: Signal<readonly VentaHistoricoResumen[]> = computed(
    (): readonly VentaHistoricoResumen[] => this.resultado()?.ventas ?? [],
  );

  readonly resumen: Signal<ResumenHistorico | null> = computed(
    (): ResumenHistorico | null => this.resultado()?.resumen ?? null,
  );

  readonly canSearchRange: Signal<boolean> = computed((): boolean => {
    const desde: string = this.desde();
    const hasta: string = this.hasta();

    return desde.length > 0 && hasta.length > 0 && desde <= hasta;
  });

  private readonly closeButton: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  private loadRequestId: number = 0;
  private detailRequestId: number = 0;

  /**
   * Inicializa los filtros con la fecha local actual
   * y carga automáticamente el día en curso.
   */
  ngOnInit(): void {
    const today: string = this.getTodayLocalDate();

    this.fecha.set(today);
    this.desde.set(today);
    this.hasta.set(today);

    void this.loadFecha();
  }

  /**
   * Sitúa el foco inicial en un control interactivo del diálogo.
   */
  ngAfterViewInit(): void {
    this.closeButton()?.nativeElement.focus();
  }

  /**
   * Cambia la pestaña activa del Histórico.
   */
  selectTab(tab: HistoricalSalesTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Cambia entre consulta por día y consulta por rango.
   */
  selectFilterMode(mode: HistoricalSalesFilterMode): void {
    if (this.filterMode() === mode) {
      return;
    }

    this.filterMode.set(mode);

    if (mode === 'fecha') {
      void this.loadFecha();
    }
  }

  /**
   * Actualiza la fecha seleccionada y consulta ese día.
   */
  onFechaChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    if (input.value.length === 0) {
      return;
    }

    this.fecha.set(input.value);

    void this.loadFecha();
  }

  /**
   * Actualiza el inicio del rango sin lanzar todavía la consulta.
   */
  onDesdeChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.desde.set(input.value);
  }

  /**
   * Actualiza el final del rango sin lanzar todavía la consulta.
   */
  onHastaChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.hasta.set(input.value);
  }

  /**
   * Avanza o retrocede la fecha activa el número de días indicado.
   */
  moveFecha(days: number): void {
    const nextDate: string = this.shiftLocalDate(this.fecha(), days);

    this.fecha.set(nextDate);

    void this.loadFecha();
  }

  /**
   * Consulta el día actualmente seleccionado.
   */
  async loadFecha(): Promise<void> {
    const fecha: string = this.fecha();

    if (fecha.length === 0) {
      return;
    }

    await this.load({
      desde: fecha,
      hasta: fecha,
    });
  }

  /**
   * Consulta el rango civil actualmente seleccionado.
   */
  async searchRange(): Promise<void> {
    if (!this.canSearchRange()) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');

      return;
    }

    await this.load({
      desde: this.desde(),
      hasta: this.hasta(),
    });
  }

  /**
   * Selecciona una venta y recupera bajo demanda
   * su snapshot histórico completo.
   */
  selectVenta(idVenta: number): void {
    if (this.selectedVentaId() === idVenta && this.detalle()?.id === idVenta) {
      return;
    }

    this.selectedVentaId.set(idVenta);
    this.detalle.set(null);
    this.detalleError.set(null);

    void this.loadDetalle(idVenta);
  }

  /**
   * Reintenta la carga del detalle actualmente seleccionado.
   */
  retryDetalle(): void {
    const idVenta: number | null = this.selectedVentaId();

    if (idVenta === null) {
      return;
    }

    void this.loadDetalle(idVenta);
  }

  /**
   * Construye el texto compacto de los tipos de pago de una venta.
   */
  getPagosLabel(venta: VentaHistoricoResumen): string {
    if (venta.pagos.length === 0) {
      return 'Sin pago';
    }

    return venta.pagos.map((pago): string => pago.nombre).join(' + ');
  }

  /**
   * Construye la referencia documental visible de una venta.
   */
  getVentaReferencia(venta: VentaHistoricoResumen): string {
    return `${venta.serie}${venta.numero}`;
  }

  /**
   * Solicita cerrar el modal de Histórico.
   */
  close(): void {
    this.closeEvent.emit();
  }

  /**
   * Ejecuta una consulta de Histórico evitando que una respuesta
   * antigua sobrescriba filtros modificados posteriormente.
   */
  private async load(consulta: VentaHistoricoConsulta): Promise<void> {
    const requestId: number = ++this.loadRequestId;

    this.loading.set(true);
    this.error.set(null);

    try {
      const resultado: VentasHistoricoResultado =
        await this.ventasHistoricoService.getHistorico(consulta);

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.resultado.set(resultado);

      const selectedVentaId: number | null = this.selectedVentaId();

      if (
        selectedVentaId !== null &&
        !resultado.ventas.some(
          (venta: VentaHistoricoResumen): boolean => venta.id === selectedVentaId,
        )
      ) {
        this.clearDetalleSelection();
      }
    } catch (error: unknown) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.resultado.set(null);
      this.clearDetalleSelection();

      this.error.set(getErrorMessage(error, 'No se ha podido recuperar el histórico de ventas.'));
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Recupera el detalle de una venta protegiendo la UI
   * frente a respuestas antiguas de selecciones anteriores.
   */
  private async loadDetalle(idVenta: number): Promise<void> {
    const requestId: number = ++this.detailRequestId;

    this.detalleLoading.set(true);
    this.detalleError.set(null);

    try {
      const detalle: VentaHistoricoDetalle | null =
        await this.ventasHistoricoService.getDetalle(idVenta);

      if (requestId !== this.detailRequestId || this.selectedVentaId() !== idVenta) {
        return;
      }

      if (detalle === null) {
        this.detalle.set(null);
        this.detalleError.set('La venta seleccionada ya no se encuentra disponible.');

        return;
      }

      this.detalle.set(detalle);
    } catch (error: unknown) {
      if (requestId !== this.detailRequestId || this.selectedVentaId() !== idVenta) {
        return;
      }

      this.detalle.set(null);

      this.detalleError.set(
        getErrorMessage(error, 'No se ha podido recuperar el detalle de la venta.'),
      );
    } finally {
      if (requestId === this.detailRequestId && this.selectedVentaId() === idVenta) {
        this.detalleLoading.set(false);
      }
    }
  }

  /**
   * Descarta la selección y cualquier detalle asociado,
   * invalidando además las cargas todavía en curso.
   */
  private clearDetalleSelection(): void {
    this.detailRequestId++;

    this.selectedVentaId.set(null);
    this.detalle.set(null);
    this.detalleError.set(null);
    this.detalleLoading.set(false);
  }

  /**
   * Devuelve la fecha civil correspondiente al día local actual.
   */
  private getTodayLocalDate(): string {
    return this.formatLocalDate(new Date());
  }

  /**
   * Desplaza una fecha civil en calendario local.
   */
  private shiftLocalDate(value: string, days: number): string {
    const parts: readonly string[] = value.split('-');

    if (parts.length !== 3) {
      return value;
    }

    const year: number = Number(parts[0]);
    const month: number = Number(parts[1]);
    const day: number = Number(parts[2]);

    const date: Date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + days);

    return this.formatLocalDate(date);
  }

  /**
   * Formatea una fecha JavaScript como fecha civil local YYYY-MM-DD.
   */
  private formatLocalDate(date: Date): string {
    const year: string = String(date.getFullYear()).padStart(4, '0');
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
