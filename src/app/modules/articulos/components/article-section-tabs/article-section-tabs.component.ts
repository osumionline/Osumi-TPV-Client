import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import {
  ARTICLE_SECTIONS,
  NEW_ARTICLE_HIDDEN_SECTIONS,
  WEB_SECTION,
  type ArticleSectionDefinition,
} from '@modules/articulos/components/article-section-tabs/article-section-tabs.component.private';

/**
 * Muestra las secciones internas de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-section-tabs',
  templateUrl: './article-section-tabs.component.html',
  styleUrl: './article-section-tabs.component.scss',
})
export default class ArticleSectionTabsComponent {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly selectSectionEvent: OutputEmitterRef<ArticuloWorkspaceSection> =
    output<ArticuloWorkspaceSection>();

  /**
   * Obtiene las secciones visibles para la ficha actual.
   */
  getSections(): readonly ArticleSectionDefinition[] {
    const sections: readonly ArticleSectionDefinition[] =
      this.tab().draft.id === null
        ? ARTICLE_SECTIONS.filter(
            (section: ArticleSectionDefinition): boolean =>
              !NEW_ARTICLE_HIDDEN_SECTIONS.has(section.id),
          )
        : ARTICLE_SECTIONS;

    if (!this.tab().draft.ventaOnline) {
      return sections;
    }

    return [sections[0], WEB_SECTION, ...sections.slice(1)];
  }

  /**
   * Solicita cambiar la sección activa.
   */
  selectSection(section: ArticuloWorkspaceSection): void {
    this.selectSectionEvent.emit(section);
  }
}
