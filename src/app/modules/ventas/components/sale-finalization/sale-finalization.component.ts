import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import VentaFinalizacionEnCurso from '@model/ventas/venta-finalizacion-en-curso.model';
import type { VentaFinalizacionResultado } from '@model/ventas/venta-finalizacion-resultado.interface';
import type VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import { getErrorMessage } from '@utils/error.utils';
import { centsToEuros, eurosToCents } from '@utils/money.utils';

@Component({
  selector: 'otpv-sale-finalization',
  templateUrl: './sale-finalization.component.html',
  styleUrl: './sale-finalization.component.scss',
  imports: [
    CurrencyPipe,
    MatButton,
    MatFormFieldModule,
    MatIcon,
    MatIconButton,
    MatInput,
    CentsToEurosPipe,
  ],
})
export default class SaleFinalizationComponent implements OnInit {
  readonly totalCents: InputSignal<number> = input.required<number>();
  readonly tiposPago: InputSignal<readonly TipoPago[]> = input.required<readonly TipoPago[]>();

  readonly reservaBlockedReason: InputSignal<string | null> = input<string | null>(null);

  readonly reservaSaving: InputSignal<boolean> = input<boolean>(false);
  readonly ventaSaving: InputSignal<boolean> = input<boolean>(false);

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly finalizeEvent: OutputEmitterRef<VentaFinalizacionResultado> =
    output<VentaFinalizacionResultado>();

  readonly reservaSinTicketEvent: OutputEmitterRef<void> = output<void>();
  readonly reservaConTicketEvent: OutputEmitterRef<void> = output<void>();

  readonly saving: Signal<boolean> = computed(
    (): boolean => this.reservaSaving() || this.ventaSaving(),
  );

  /**
   * El modelo es mutable durante la interacción.
   *
   * Se fuerza la notificación aunque la referencia siga siendo
   * la misma, igual que hacemos con otros modelos vivos de Ventas.
   */
  readonly finalizacion: WritableSignal<VentaFinalizacionEnCurso | null> =
    signal<VentaFinalizacionEnCurso | null>(null, {
      equal: (): boolean => false,
    });

  readonly cambioTotalCents: Signal<number> = computed((): number => {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return 0;
    }

    return finalizacion.pagos.reduce(
      (total: number, pago: VentaPagoEnCurso): number => total + pago.cambioCents,
      0,
    );
  });

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly tiposPagoFisicos: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] =>
    [...this.tiposPago()]
      .filter((tipoPago: TipoPago): boolean => tipoPago.fisico)
      .sort(
        (a: TipoPago, b: TipoPago): number =>
          a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'),
      ),
  );

  /**
   * Cada apertura del componente crea una finalización nueva.
   *
   * Cancelar el overlay descarta por tanto todo su estado.
   */
  ngOnInit(): void {
    this.finalizacion.set(new VentaFinalizacionEnCurso(this.totalCents()));
  }

  /**
   * Añade el tipo de pago indicado aplicando inicialmente
   * todo el importe que todavía queda pendiente.
   *
   * En los siguientes pasos podremos editar ese importe
   * para construir pagos múltiples.
   */
  addTipoPago(tipoPago: TipoPago): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (
      this.saving() ||
      finalizacion === null ||
      finalizacion.completa ||
      this.isTipoPagoAdded(tipoPago)
    ) {
      return;
    }

    try {
      finalizacion.addPago(tipoPago, finalizacion.pendienteCents);

      this.error.set(null);

      /*
       * La instancia es deliberadamente la misma.
       * El signal utiliza equal:false para notificar la mutación.
       */
      this.finalizacion.set(finalizacion);
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido añadir el medio de pago.'));
    }
  }

  /**
   * Devuelve el importe del pago como cantidad positiva
   * expresada en euros para su edición.
   *
   * En una devolución el signo negativo pertenece al dominio,
   * no a la interacción del usuario.
   */
  getPagoImporteEuros(pago: VentaPagoEnCurso): number {
    return Math.abs(centsToEuros(pago.importeCents));
  }

  /**
   * Devuelve el efectivo entregado por el cliente
   * como cantidad positiva expresada en euros.
   */
  getPagoEntregadoEuros(pago: VentaPagoEnCurso): number {
    if (!pago.esEfectivo || pago.entregadoCents === null) {
      return 0;
    }

    return centsToEuros(pago.entregadoCents);
  }

  /**
   * Calcula el máximo que puede asignarse actualmente
   * a un pago sin superar el total de la operación.
   *
   * Incluye el importe que ya tiene ese mismo pago
   * más lo que todavía queda pendiente.
   */
  getPagoMaxEuros(pago: VentaPagoEnCurso): number {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return this.getPagoImporteEuros(pago);
    }

    return Math.abs(centsToEuros(pago.importeCents + finalizacion.pendienteCents));
  }

  /**
   * Selecciona el contenido completo de un input monetario
   * para facilitar la sustitución directa del importe.
   */
  selectInputContent(event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    inputElement.select();
  }

  /**
   * Actualiza el importe aplicado por un medio de pago.
   */
  updatePagoImporte(pago: VentaPagoEnCurso, event: Event): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const euros: number = inputElement.valueAsNumber;

    if (Number.isNaN(euros) || !Number.isFinite(euros) || euros <= 0) {
      this.error.set('El importe debe ser mayor que 0,00 €.');

      inputElement.value = String(this.getPagoImporteEuros(pago));

      return;
    }

    try {
      const importeAbsCents: number = eurosToCents(euros);

      if (importeAbsCents <= 0) {
        throw new RangeError('El importe debe ser mayor que 0,00 €.');
      }

      const maxImporteCents: number = Math.abs(pago.importeCents + finalizacion.pendienteCents);

      if (importeAbsCents > maxImporteCents) {
        throw new RangeError(
          `El importe no puede superar ${centsToEuros(maxImporteCents).toFixed(2)} €.`,
        );
      }

      const importeCents: number = finalizacion.totalCents < 0 ? -importeAbsCents : importeAbsCents;

      const pagoActualizado: VentaPagoEnCurso = finalizacion.updatePago(
        pago.tipoPagoPublicId,
        importeCents,
      );

      this.error.set(null);

      this.finalizacion.set(finalizacion);

      /*
       * Normalizamos también el valor visible por si el
       * usuario introdujo más de dos decimales.
       */
      inputElement.value = String(this.getPagoImporteEuros(pagoActualizado));
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido modificar el importe del pago.'));

      /*
       * updatePago() es atómico respecto al estado del modelo:
       * si falla, el pago original continúa intacto.
       */
      inputElement.value = String(this.getPagoImporteEuros(pago));
    }
  }

  /**
   * Actualiza la cantidad físicamente entregada
   * por el cliente para un pago en efectivo.
   *
   * No modifica el importe aplicado a la venta.
   */
  updatePagoEntregado(pago: VentaPagoEnCurso, event: Event): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null || !pago.esEfectivo || pago.importeCents < 0) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const euros: number = inputElement.valueAsNumber;

    if (Number.isNaN(euros) || !Number.isFinite(euros) || euros <= 0) {
      this.error.set('La cantidad entregada debe ser mayor que 0,00 €.');

      inputElement.value = String(this.getPagoEntregadoEuros(pago));

      return;
    }

    try {
      const entregadoCents: number = eurosToCents(euros);

      if (entregadoCents < pago.importeCents) {
        throw new RangeError(
          `La cantidad entregada no puede ser inferior a ${centsToEuros(pago.importeCents).toFixed(
            2,
          )} €.`,
        );
      }

      const pagoActualizado: VentaPagoEnCurso = finalizacion.updatePago(
        pago.tipoPagoPublicId,
        pago.importeCents,
        entregadoCents,
      );

      this.error.set(null);
      this.finalizacion.set(finalizacion);

      inputElement.value = String(this.getPagoEntregadoEuros(pagoActualizado));
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido modificar la cantidad entregada.'));

      inputElement.value = String(this.getPagoEntregadoEuros(pago));
    }
  }

  /**
   * Elimina un medio de pago de la finalización.
   */
  removePago(tipoPagoPublicId: string): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null) {
      return;
    }

    finalizacion.removePago(tipoPagoPublicId);

    this.error.set(null);

    this.finalizacion.set(finalizacion);
  }

  /**
   * Indica si un tipo de pago ya forma parte
   * de la liquidación.
   */
  isTipoPagoAdded(tipoPago: TipoPago): boolean {
    const publicId: string | null = tipoPago.publicId;

    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (publicId === null || finalizacion === null) {
      return false;
    }

    return finalizacion.pagos.some(
      (pago: VentaPagoEnCurso): boolean => pago.tipoPagoPublicId === publicId,
    );
  }

  /**
   * Indica si el medio puede añadirse en el estado actual.
   */
  canAddTipoPago(tipoPago: TipoPago): boolean {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    return (
      !this.saving() &&
      finalizacion !== null &&
      !finalizacion.completa &&
      !this.isTipoPagoAdded(tipoPago)
    );
  }

  /**
   * Produce el snapshot económico definitivo y solicita
   * al workspace la persistencia de la venta.
   */
  finalizeVenta(): void {
    if (this.saving()) {
      return;
    }

    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null || !finalizacion.completa) {
      return;
    }

    try {
      const resultado: VentaFinalizacionResultado = finalizacion.toResultado();

      this.error.set(null);

      this.finalizeEvent.emit(resultado);
    } catch (error: unknown) {
      this.error.set(
        getErrorMessage(error, 'No se ha podido preparar la finalización de la venta.'),
      );
    }
  }

  /**
   * Solicita guardar la venta como reserva
   * e imprimir su comprobante.
   */
  createReservaConTicket(): void {
    if (this.saving() || this.reservaBlockedReason() !== null) {
      return;
    }

    this.reservaConTicketEvent.emit();
  }

  /**
   * Solicita guardar la venta actual como reserva
   * sin imprimir comprobante.
   */
  createReservaSinTicket(): void {
    if (this.saving() || this.reservaBlockedReason() !== null) {
      return;
    }

    this.reservaSinTicketEvent.emit();
  }

  /**
   * Cancela la finalización sin modificar VentaEnCurso.
   */
  cancel(): void {
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }
}
