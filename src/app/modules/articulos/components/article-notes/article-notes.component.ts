import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

/**
 * Edita las observaciones y sus opciones de visualización.
 */
@Component({
  selector: 'otpv-article-notes',
  templateUrl: './article-notes.component.html',
  styleUrl: './article-notes.component.scss',
  imports: [MatSlideToggle],
})
export default class ArticleNotesComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly draftChangeEvent: OutputEmitterRef<ArticuloDraftPatch> = output<ArticuloDraftPatch>();

  /**
   * Actualiza las observaciones del artículo.
   */
  onObservacionesInput(event: Event): void {
    const inputElement: HTMLTextAreaElement = event.currentTarget as HTMLTextAreaElement;

    this.draftChangeEvent.emit({
      observaciones: inputElement.value,
    });
  }

  /**
   * Indica si las observaciones deben mostrarse en Pedidos.
   */
  onMostrarPedidosChange(checked: boolean): void {
    this.draftChangeEvent.emit({
      mostrarObservacionesPedidos: checked,
    });
  }

  /**
   * Indica si las observaciones deben mostrarse en Ventas.
   */
  onMostrarVentasChange(checked: boolean): void {
    this.draftChangeEvent.emit({
      mostrarObservacionesVentas: checked,
    });
  }
}
