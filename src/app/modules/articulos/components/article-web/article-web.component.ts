import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type {
  ArticuloDraftPatch,
  ArticuloFotoDraft,
} from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticlePhotosComponent from '@modules/articulos/components/article-photos/article-photos.component';

/**
 * Edita los datos específicos de publicación web
 * de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-web',
  templateUrl: './article-web.component.html',
  styleUrl: './article-web.component.scss',
  imports: [ArticlePhotosComponent, MatSlideToggle],
})
export default class ArticleWebComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly draftChangeEvent: OutputEmitterRef<ArticuloDraftPatch> = output<ArticuloDraftPatch>();

  /**
   * Activa o desactiva la publicación visible del artículo.
   */
  onMostrarEnWebChange(checked: boolean): void {
    this.draftChangeEvent.emit({
      mostrarEnWeb: checked,
    });
  }

  /**
   * Actualiza la descripción corta destinada a la web.
   */
  onDescripcionCortaInput(event: Event): void {
    const inputElement: HTMLTextAreaElement = event.currentTarget as HTMLTextAreaElement;

    this.draftChangeEvent.emit({
      descripcionCorta: inputElement.value,
    });
  }

  /**
   * Actualiza la descripción larga destinada a la web.
   */
  onDescripcionLargaInput(event: Event): void {
    const inputElement: HTMLTextAreaElement = event.currentTarget as HTMLTextAreaElement;

    this.draftChangeEvent.emit({
      descripcionLarga: inputElement.value,
    });
  }

  /**
   * Actualiza conjuntamente la colección editable de fotos.
   */
  onFotosChange(fotos: readonly ArticuloFotoDraft[]): void {
    this.draftChangeEvent.emit({
      fotos,
    });
  }
}
