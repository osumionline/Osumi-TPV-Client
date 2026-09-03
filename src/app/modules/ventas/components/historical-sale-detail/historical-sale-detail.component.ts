import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import HistoricalSaleEmailFormComponent from '@modules/ventas/components/historical-sale-email-form/historical-sale-email-form.component';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

type HistoricalSaleDetailMode = 'postventa' | 'readonly';

/**
 * Representa el detalle histórico ya resuelto de una venta.
 */
@Component({
  selector: 'otpv-historical-sale-detail',
  templateUrl: './historical-sale-detail.component.html',
  styleUrl: './historical-sale-detail.component.scss',
  imports: [
    HistoricalSaleEmailFormComponent,
    CurrencyPipe,
    DatePipe,
    MatButton,
    MatIcon,
    CentsToEurosPipe,
    MicrosToEurosPipe,
  ],
})
export default class HistoricalSaleDetailComponent {
  readonly detalle: InputSignal<VentaHistoricoDetalle> = input.required<VentaHistoricoDetalle>();
  readonly tiposPago: InputSignal<readonly TipoPago[]> = input<readonly TipoPago[]>([]);
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly postventaError: InputSignal<string | null> = input<string | null>(null);
  readonly postventaWarning: InputSignal<string | null> = input<string | null>(null);
  readonly emailConfigured: InputSignal<boolean> = input<boolean>(false);
  readonly postventaInfo: InputSignal<string | null> = input<string | null>(null);
  readonly mode: InputSignal<HistoricalSaleDetailMode> =
    input<HistoricalSaleDetailMode>('postventa');

  readonly changeClientEvent: OutputEmitterRef<void> = output<void>();
  readonly changeTipoPagoEvent: OutputEmitterRef<string> = output<string>();
  readonly printGiftTicketEvent: OutputEmitterRef<void> = output<void>();
  readonly reprintTicketEvent: OutputEmitterRef<void> = output<void>();
  readonly sendTicketEmailEvent: OutputEmitterRef<string> = output<string>();
  readonly processTicketBaiEvent: OutputEmitterRef<void> = output<void>();
  readonly reconcileTicketBaiEvent: OutputEmitterRef<void> = output<void>();
  readonly retryTicketBaiEvent: OutputEmitterRef<void> = output<void>();
  readonly selectingEmail: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectingTipoPago: WritableSignal<boolean> = signal<boolean>(false);

  readonly tiposPagoAlternativos: Signal<readonly TipoPago[]> = computed(
    (): readonly TipoPago[] => {
      const pagoActualPublicId: string | null =
        this.detalle().pagos.length === 1
          ? (this.detalle().pagos[0]?.tipoPagoPublicId ?? null)
          : null;

      return [...this.tiposPago()]
        .filter(
          (tipoPago: TipoPago): boolean =>
            tipoPago.fisico &&
            tipoPago.publicId !== null &&
            tipoPago.publicId !== pagoActualPublicId,
        )
        .sort(
          (a: TipoPago, b: TipoPago): number =>
            a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'),
        );
    },
  );

  /**
   * Construye la referencia documental visible de la venta.
   */
  getReferencia(): string {
    const detalle: VentaHistoricoDetalle = this.detalle();

    return `${detalle.serie}${detalle.numero}`;
  }

  /**
   * Solicita modificar el cliente de la venta.
   */
  requestCambiarCliente(): void {
    if (this.saving() || !this.detalle().capacidades.puedeCambiarCliente) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);
    this.changeClientEvent.emit();
  }

  /**
   * Muestra los tipos de pago alternativos disponibles.
   */
  openTipoPagoSelection(): void {
    if (
      this.saving() ||
      !this.detalle().capacidades.puedeCambiarTipoPago ||
      this.tiposPagoAlternativos().length === 0
    ) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(true);
  }

  /**
   * Cierra la selección de medio de pago sin modificar la venta.
   */
  closeTipoPagoSelection(): void {
    if (this.saving()) {
      return;
    }

    this.selectingTipoPago.set(false);
  }

  /**
   * Solicita sustituir el pago actual por el tipo seleccionado.
   */
  selectTipoPago(tipoPago: TipoPago): void {
    if (
      this.saving() ||
      tipoPago.publicId === null ||
      !this.tiposPagoAlternativos().some(
        (item: TipoPago): boolean => item.publicId === tipoPago.publicId,
      )
    ) {
      return;
    }

    this.selectingTipoPago.set(false);
    this.changeTipoPagoEvent.emit(tipoPago.publicId);
  }

  /**
   * Solicita imprimir un ticket regalo de la venta.
   */
  requestPrintGiftTicket(): void {
    if (this.saving() || !this.detalle().capacidades.puedeImprimirTicketRegalo) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);

    this.printGiftTicketEvent.emit();
  }

  /**
   * Solicita reimprimir el PDF vigente de la venta.
   */
  requestReprintTicket(): void {
    if (this.saving()) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);

    this.reprintTicketEvent.emit();
  }

  /**
   * Solicita continuar el procesamiento TicketBAI
   * inicial de una venta pendiente local.
   */
  requestProcessTicketBai(): void {
    if (this.saving() || !this.detalle().capacidades.puedeProcesarTicketBai) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);
    this.processTicketBaiEvent.emit();
  }

  /**
   * Solicita comprobar remotamente el estado
   * TicketBAI de la venta.
   */
  requestReconcileTicketBai(): void {
    if (this.saving() || !this.detalle().capacidades.puedeComprobarTicketBai) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);
    this.reconcileTicketBaiEvent.emit();
  }

  /**
   * Solicita reintentar una factura TicketBAI
   * que ha sido rechazada.
   */
  requestRetryTicketBai(): void {
    if (this.saving() || !this.detalle().capacidades.puedeReintentarTicketBai) {
      return;
    }

    this.selectingEmail.set(false);
    this.selectingTipoPago.set(false);
    this.retryTicketBaiEvent.emit();
  }

  /**
   * Muestra el formulario de destinatario
   * para enviar el ticket por email.
   */
  requestSendTicketEmail(): void {
    if (this.saving() || !this.emailConfigured()) {
      return;
    }

    this.selectingTipoPago.set(false);
    this.selectingEmail.set(true);
  }

  /**
   * Cancela la introducción del destinatario.
   */
  cancelEmailSelection(): void {
    if (this.saving()) {
      return;
    }

    this.selectingEmail.set(false);
  }

  /**
   * Solicita el envío al destinatario indicado.
   */
  sendTicketEmail(destinatario: string): void {
    if (this.saving() || !this.emailConfigured()) {
      return;
    }

    this.selectingEmail.set(false);

    this.sendTicketEmailEvent.emit(destinatario);
  }
}
