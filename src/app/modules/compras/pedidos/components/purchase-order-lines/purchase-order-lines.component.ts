import { DecimalPipe } from '@angular/common';
import { Component, computed, input, type InputSignal, type Signal } from '@angular/core';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

/**
 * Muestra las líneas que forman parte de un Pedido.
 */
@Component({
  selector: 'otpv-purchase-order-lines',
  templateUrl: './purchase-order-lines.component.html',
  styleUrl: './purchase-order-lines.component.scss',
  imports: [BpsToPercentPipe, DecimalPipe, MicrosToEurosPipe],
})
export default class PurchaseOrderLinesComponent {
  readonly lines: InputSignal<readonly PedidoLineaInterface[]> =
    input.required<readonly PedidoLineaInterface[]>();

  readonly visibleColumns: InputSignal<readonly number[]> = input.required<readonly number[]>();

  readonly recargoEquivalencia: InputSignal<boolean> = input.required<boolean>();

  readonly visibleColumnIds: Signal<ReadonlySet<number>> = computed(
    (): ReadonlySet<number> => new Set<number>(this.visibleColumns()),
  );
}
