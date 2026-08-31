import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

interface ArticleSectionDefinition {
  readonly id: ArticuloWorkspaceSection;
  readonly label: string;
}

const ARTICLE_SECTIONS: readonly ArticleSectionDefinition[] = [
  {
    id: 'general',
    label: 'GENERAL',
  },
  {
    id: 'barcodes',
    label: 'CÓDIGOS DE BARRAS',
  },
  {
    id: 'statistics',
    label: 'ESTADÍSTICAS',
  },
  {
    id: 'history',
    label: 'HISTÓRICO',
  },
  {
    id: 'notes',
    label: 'OBSERVACIONES',
  },
  {
    id: 'deactivate',
    label: 'BAJA',
  },
];

const WEB_SECTION: ArticleSectionDefinition = {
  id: 'web',
  label: 'WEB',
};

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
    if (!this.tab().draft.ventaOnline) {
      return ARTICLE_SECTIONS;
    }

    return [ARTICLE_SECTIONS[0], WEB_SECTION, ...ARTICLE_SECTIONS.slice(1)];
  }

  /**
   * Solicita cambiar la sección activa.
   */
  selectSection(section: ArticuloWorkspaceSection): void {
    this.selectSectionEvent.emit(section);
  }
}
