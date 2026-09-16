import {
  getProveedorSectionDefinitions,
  type ProveedorSectionDefinition,
} from '@modules/compras/proveedores/components/proveedor-section-tabs/proveedor-section-tabs.component.private';
import { describe, expect, it } from 'vitest';

describe('proveedor-section-tabs.component.private', (): void => {
  it('muestra únicamente Datos para un Proveedor nuevo', (): void => {
    const sections: readonly ProveedorSectionDefinition[] = getProveedorSectionDefinitions(false);

    expect(sections).toEqual([
      {
        id: 'data',
        label: 'DATOS',
      },
    ]);
  });

  it('muestra las tres secciones para un Proveedor persistido', (): void => {
    const sections: readonly ProveedorSectionDefinition[] = getProveedorSectionDefinitions(true);

    expect(sections).toEqual([
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
    ]);
  });
});
