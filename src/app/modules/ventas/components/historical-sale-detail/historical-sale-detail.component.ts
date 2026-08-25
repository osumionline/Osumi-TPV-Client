import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, type InputSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

/**
 * Representa el detalle histórico ya resuelto de una venta.
 */
@Component({
  selector: 'otpv-historical-sale-detail',
  templateUrl: './historical-sale-detail.component.html',
  styleUrl: './historical-sale-detail.component.scss',
  imports: [CurrencyPipe, DatePipe, MatIcon, CentsToEurosPipe, MicrosToEurosPipe],
})
export default class HistoricalSaleDetailComponent {
  readonly detalle: InputSignal<VentaHistoricoDetalle> = input.required<VentaHistoricoDetalle>();

  /**
   * Construye la referencia documental visible de la venta.
   */
  getReferencia(): string {
    const detalle: VentaHistoricoDetalle = this.detalle();

    return `${detalle.serie}${detalle.numero}`;
  }
}
