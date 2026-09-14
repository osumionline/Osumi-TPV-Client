import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';

export interface MarcaSectionDefinition {
  readonly id: MarcaWorkspaceSection;
  readonly label: string;
}

const MARCA_SECTIONS: readonly MarcaSectionDefinition[] = [
  {
    id: 'data',
    label: 'DATOS',
  },
  {
    id: 'statistics',
    label: 'ESTADÍSTICAS',
  },
];

/**
 * Recupera las pestañas disponibles según
 * si la Marca ya dispone de identidad persistida.
 */
export function getMarcaSectionDefinitions(persisted: boolean): readonly MarcaSectionDefinition[] {
  if (persisted) {
    return MARCA_SECTIONS;
  }

  return MARCA_SECTIONS.filter((section: MarcaSectionDefinition): boolean => section.id === 'data');
}
