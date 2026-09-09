import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';

export interface ArticleSectionDefinition {
  readonly id: ArticuloWorkspaceSection;
  readonly label: string;
}

export const ARTICLE_SECTIONS: readonly ArticleSectionDefinition[] = [
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

export const NEW_ARTICLE_HIDDEN_SECTIONS: ReadonlySet<ArticuloWorkspaceSection> =
  new Set<ArticuloWorkspaceSection>(['statistics', 'history', 'deactivate']);

export const WEB_SECTION: ArticleSectionDefinition = {
  id: 'web',
  label: 'WEB',
};
