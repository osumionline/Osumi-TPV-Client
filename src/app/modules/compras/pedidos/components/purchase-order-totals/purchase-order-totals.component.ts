import { DecimalPipe } from '@angular/common';
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
import type { PurchaseOrderTotals } from '@model/compras/pedidos/purchase-order-totals.interface';
import {
  formatPurchaseOrderTotalsDecimal,
  getPurchaseOrderDisplayedTotalMicros,
  isPurchaseOrderTotalsTransientDecimal,
  limitPurchaseOrderTotalsDecimalFraction,
  parsePurchaseOrderTotalsDecimal,
  type PurchaseOrderTotalsEditableField,
} from '@modules/compras/pedidos/components/purchase-order-totals/purchase-order-totals.component.private';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

/**
 * Muestra los totales globales y permite editar
 * los valores económicos globales de un Pedido pendiente.
 */
@Component({
  selector: 'otpv-purchase-order-totals',
  templateUrl: './purchase-order-totals.component.html',
  styleUrl: './purchase-order-totals.component.scss',
  imports: [BpsToPercentPipe, DecimalPipe, MicrosToEurosPipe],
})
export default class PurchaseOrderTotalsComponent {
  readonly totals: InputSignal<PurchaseOrderTotals> = input.required<PurchaseOrderTotals>();

  readonly importeMicros: InputSignal<number> = input.required<number>();

  readonly portesMicros: InputSignal<number> = input.required<number>();

  readonly descuentoGlobalBps: InputSignal<number> = input.required<number>();

  readonly recargoEquivalencia: InputSignal<boolean> = input.required<boolean>();

  readonly europeo: InputSignal<boolean> = input.required<boolean>();

  readonly recepcionado: InputSignal<boolean> = input.required<boolean>();

  readonly processing: InputSignal<boolean> = input.required<boolean>();

  readonly portesChange: OutputEmitterRef<number> = output<number>();

  readonly descuentoGlobalChange: OutputEmitterRef<number> = output<number>();

  readonly editingField: WritableSignal<PurchaseOrderTotalsEditableField | null> =
    signal<PurchaseOrderTotalsEditableField | null>(null);

  readonly editingValue: WritableSignal<string> = signal<string>('');

  readonly displayedTotalMicros: Signal<number> = computed((): number =>
    getPurchaseOrderDisplayedTotalMicros(this.recepcionado(), this.importeMicros(), this.totals()),
  );

  /**
   * Inicia la edición de un valor económico global.
   */
  onEconomicFocus(field: PurchaseOrderTotalsEditableField, event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.editingField.set(field);
    this.editingValue.set(inputElement.value);

    inputElement.select();
  }

  /**
   * Procesa un valor económico global mientras
   * el usuario escribe.
   */
  onEconomicInput(field: PurchaseOrderTotalsEditableField, event: Event): void {
    if (this.recepcionado() || this.processing()) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const fractionDigits: number = field === 'portes' ? 6 : 2;

    const rawValue: string = limitPurchaseOrderTotalsDecimalFraction(
      inputElement.value,
      fractionDigits,
    );

    if (rawValue !== inputElement.value) {
      inputElement.value = rawValue;
    }

    this.editingValue.set(rawValue);

    if (isPurchaseOrderTotalsTransientDecimal(rawValue)) {
      return;
    }

    const value: number | null = parsePurchaseOrderTotalsDecimal(rawValue, fractionDigits);

    if (value === null || (field === 'descuento' && value > 10_000)) {
      return;
    }

    this.emitEconomicChange(field, value);
  }

  /**
   * Finaliza la edición y restaura el valor
   * canónico si la entrada no es válida.
   */
  onEconomicBlur(field: PurchaseOrderTotalsEditableField, event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const fractionDigits: number = field === 'portes' ? 6 : 2;

    const value: number | null = parsePurchaseOrderTotalsDecimal(
      inputElement.value,
      fractionDigits,
    );

    if (value === null || (field === 'descuento' && value > 10_000)) {
      inputElement.value = this.formatEconomicValue(field);
    } else {
      this.emitEconomicChange(field, value);
    }

    this.editingField.set(null);
    this.editingValue.set('');
  }

  /**
   * Obtiene el contenido que debe mostrarse
   * dentro de un editor económico.
   */
  getEconomicInputValue(field: PurchaseOrderTotalsEditableField): string {
    if (this.editingField() === field) {
      return this.editingValue();
    }

    return this.formatEconomicValue(field);
  }

  /**
   * Formatea un valor económico global
   * para presentarlo dentro de su editor.
   */
  private formatEconomicValue(field: PurchaseOrderTotalsEditableField): string {
    if (field === 'portes') {
      return formatPurchaseOrderTotalsDecimal(this.portesMicros(), 6, 2);
    }

    return formatPurchaseOrderTotalsDecimal(this.descuentoGlobalBps(), 2, 0);
  }

  /**
   * Propaga al Pedido el valor económico
   * global que acaba de cambiar.
   */
  private emitEconomicChange(field: PurchaseOrderTotalsEditableField, value: number): void {
    if (field === 'portes') {
      this.portesChange.emit(value);

      return;
    }

    this.descuentoGlobalChange.emit(value);
  }
}
