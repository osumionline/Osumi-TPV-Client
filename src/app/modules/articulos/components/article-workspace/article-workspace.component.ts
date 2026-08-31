import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

/**
 * Muestra la cabecera operativa de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-workspace',
  templateUrl: './article-workspace.component.html',
  styleUrl: './article-workspace.component.scss',
  imports: [MatIcon, MatTooltip],
})
export default class ArticleWorkspaceComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly searching: InputSignal<boolean> = input<boolean>(false);
  readonly resolveCodeEvent: OutputEmitterRef<string> = output<string>();
  readonly searchEvent: OutputEmitterRef<string> = output<string>();
  readonly nameChangeEvent: OutputEmitterRef<{
    readonly idTemporal: string;
    readonly nombre: string;
  }> = output<{
    readonly idTemporal: string;
    readonly nombre: string;
  }>();

  /**
   * Selecciona el contenido del localizador para facilitar
   * la introducción inmediata de otro código.
   */
  onLocalizadorFocus(event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    inputElement.select();
  }

  /**
   * Interpreta la entrada del localizador.
   *
   * Una letra inicia la búsqueda por nombre y Enter resuelve
   * localizador, acceso directo o código de barras.
   */
  onLocalizadorKeydown(event: KeyboardEvent): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    if (/^\p{L}$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();

      const query: string = `${inputElement.value}${event.key}`;

      this.restoreLocalizador(inputElement);
      this.searchEvent.emit(query);

      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const codigo: string = inputElement.value.trim();

    this.restoreLocalizador(inputElement);

    if (codigo.length === 0) {
      return;
    }

    this.resolveCodeEvent.emit(codigo);
  }

  /**
   * Abre manualmente el buscador de artículos.
   */
  openSearch(): void {
    this.searchEvent.emit('');
  }

  /**
   * Actualiza el nombre editable de la ficha.
   */
  onNameInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.nameChangeEvent.emit({
      idTemporal: this.tab().idTemporal,
      nombre: inputElement.value,
    });
  }

  /**
   * Restaura en el campo el localizador real de la ficha.
   */
  private restoreLocalizador(inputElement: HTMLInputElement): void {
    const localizador: number | null = this.tab().draft.localizador;

    inputElement.value = localizador === null ? '' : String(localizador);
  }
}
