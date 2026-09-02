import {
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticleBarcodesComponent from '@modules/articulos/components/article-barcodes/article-barcodes.component';
import ArticleDirectAccessesComponent from '@modules/articulos/components/article-direct-accesses/article-direct-accesses.component';
import ArticleGeneralComponent from '@modules/articulos/components/article-general/article-general.component';
import ArticleNotesComponent from '@modules/articulos/components/article-notes/article-notes.component';
import ArticleSectionTabsComponent from '@modules/articulos/components/article-section-tabs/article-section-tabs.component';
import ArticleWebComponent from '@modules/articulos/components/article-web/article-web.component';
import ArticleHistoryComponent from '@modules/articulos/components/article-history/article-history.component';

/**
 * Muestra la cabecera operativa de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-workspace',
  templateUrl: './article-workspace.component.html',
  styleUrl: './article-workspace.component.scss',
  imports: [
    ArticleBarcodesComponent,
    ArticleDirectAccessesComponent,
    ArticleGeneralComponent,
    ArticleNotesComponent,
    ArticleSectionTabsComponent,
    ArticleWebComponent,
    ArticleHistoryComponent,
    MatIcon,
    MatTooltip,
  ],
})
export default class ArticleWorkspaceComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly searching: InputSignal<boolean> = input<boolean>(false);

  readonly resolveCodeEvent: OutputEmitterRef<string> = output<string>();
  readonly searchEvent: OutputEmitterRef<string> = output<string>();
  readonly draftChangeEvent: OutputEmitterRef<{
    readonly idTemporal: string;
    readonly patch: ArticuloDraftPatch;
  }> = output<{
    readonly idTemporal: string;
    readonly patch: ArticuloDraftPatch;
  }>();
  readonly sectionChangeEvent: OutputEmitterRef<{
    readonly idTemporal: string;
    readonly section: ArticuloWorkspaceSection;
  }> = output<{
    readonly idTemporal: string;
    readonly section: ArticuloWorkspaceSection;
  }>();

  readonly directAccessOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Abre la gestión global de accesos directos.
   */
  openDirectAccesses(): void {
    this.directAccessOpen.set(true);
  }

  /**
   * Cierra la gestión global de accesos directos.
   */
  closeDirectAccesses(): void {
    this.directAccessOpen.set(false);
  }

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

      const allSelected: boolean =
        inputElement.selectionStart === 0 &&
        inputElement.selectionEnd === inputElement.value.length;
      const query: string = allSelected ? event.key : `${inputElement.value}${event.key}`;

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

    this.emitDraftChange({
      nombre: inputElement.value,
    });
  }

  /**
   * Propaga una modificación del draft a la página propietaria del workspace.
   */
  emitDraftChange(patch: ArticuloDraftPatch): void {
    this.draftChangeEvent.emit({
      idTemporal: this.tab().idTemporal,
      patch,
    });
  }

  /**
   * Propaga un cambio de sección interna.
   */
  selectSection(section: ArticuloWorkspaceSection): void {
    this.sectionChangeEvent.emit({
      idTemporal: this.tab().idTemporal,
      section,
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
