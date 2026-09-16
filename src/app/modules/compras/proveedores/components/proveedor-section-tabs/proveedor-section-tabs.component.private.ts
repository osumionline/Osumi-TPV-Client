import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';

export interface ProveedorSectionDefinition {
  readonly id: ProveedorWorkspaceSection;
  readonly label: string;
}

const PROVEEDOR_SECTIONS: readonly ProveedorSectionDefinition[] = [
  {
    id: 'data',
    label: 'DATOS',
  },
  {
    id: 'brands',
    label: 'MARCAS',
  },
  {
    id: 'commercials',
    label: 'COMERCIALES',
  },
];

/**
 * Recupera las pestañas visibles según
 * si el Proveedor ya está persistido.
 */
export function getProveedorSectionDefinitions(
  persisted: boolean,
): readonly ProveedorSectionDefinition[] {
  if (persisted) {
    return PROVEEDOR_SECTIONS;
  }

  return PROVEEDOR_SECTIONS.filter(
    (section: ProveedorSectionDefinition): boolean => section.id === 'data',
  );
}
