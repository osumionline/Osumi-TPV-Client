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
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import VentaFinalizacionEnCurso from '@model/ventas/venta-finalizacion-en-curso.model';
import type VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import { getErrorMessage } from '@utils/error.utils';

@Component({
  selector: 'otpv-sale-finalization',
  templateUrl: './sale-finalization.component.html',
  styleUrl: './sale-finalization.component.scss',
  imports: [CurrencyPipe, MatButton, MatIcon, CentsToEurosPipe],
})
export default class SaleFinalizationComponent implements OnInit {
  readonly totalCents: InputSignal<number> = input.required<number>();

  readonly tiposPago: InputSignal<readonly TipoPago[]> = input.required<readonly TipoPago[]>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

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

    if (finalizacion === null || finalizacion.completa || this.isTipoPagoAdded(tipoPago)) {
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

    return finalizacion !== null && !finalizacion.completa && !this.isTipoPagoAdded(tipoPago);
  }

  /**
   * Cancela la finalización sin modificar VentaEnCurso.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }
}
