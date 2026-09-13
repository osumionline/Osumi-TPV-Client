import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type {
  PedidoArchivoInterface,
  PedidoArchivoTipo,
} from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import {
  formatPurchaseOrderFileSize,
  getPurchaseOrderFileTypeLabel,
} from '@modules/compras/pedidos/components/purchase-order-files/purchase-order-files.component.private';

/**
 * Muestra los PDFs relacionados con un Pedido
 * y permite solicitar nuevos adjuntos.
 */
@Component({
  selector: 'otpv-purchase-order-files',
  templateUrl: './purchase-order-files.component.html',
  styleUrl: './purchase-order-files.component.scss',
  imports: [MatButton, MatIcon, MatTooltip],
})
export default class PurchaseOrderFilesComponent {
  readonly files: InputSignal<readonly PedidoArchivoInterface[]> =
    input.required<readonly PedidoArchivoInterface[]>();

  readonly attaching: InputSignal<boolean> = input.required<boolean>();

  readonly canAttach: InputSignal<boolean> = input.required<boolean>();

  readonly attachRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Solicita iniciar la selección nativa
   * de un PDF para el Pedido.
   */
  requestAttach(): void {
    if (this.attaching() || !this.canAttach()) {
      return;
    }

    this.attachRequested.emit();
  }

  /**
   * Obtiene la etiqueta visible del tipo
   * documental de un PDF.
   */
  getTypeLabel(tipo: PedidoArchivoTipo): string {
    return getPurchaseOrderFileTypeLabel(tipo);
  }

  /**
   * Obtiene el tamaño legible de un PDF.
   */
  getSizeLabel(sizeBytes: number): string {
    return formatPurchaseOrderFileSize(sizeBytes);
  }
}
