import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

/**
 * Presenta la acción destructiva de baja lógica
 * de un artículo persistido.
 */
@Component({
  selector: 'otpv-article-deactivate',
  templateUrl: './article-deactivate.component.html',
  styleUrl: './article-deactivate.component.scss',
  imports: [MatButton],
})
export default class ArticleDeactivateComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly processing: InputSignal<boolean> = input<boolean>(false);
  readonly deactivateEvent: OutputEmitterRef<string> = output<string>();

  /**
   * Solicita la baja del artículo actual.
   */
  deactivate(): void {
    if (this.processing() || this.tab().dirty || this.tab().draft.id === null) {
      return;
    }

    this.deactivateEvent.emit(this.tab().idTemporal);
  }
}
