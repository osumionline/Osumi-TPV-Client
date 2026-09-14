import {
  getMarcaSectionDefinitions,
  type MarcaSectionDefinition,
} from '@modules/compras/marcas/components/marca-section-tabs/marca-section-tabs.component.private';
import { describe, expect, it } from 'vitest';

describe('marca-section-tabs.component.private', (): void => {
  it('muestra únicamente Datos para una Marca nueva', (): void => {
    const sections: readonly MarcaSectionDefinition[] = getMarcaSectionDefinitions(false);

    expect(sections).toEqual([
      {
        id: 'data',
        label: 'DATOS',
      },
    ]);
  });

  it('muestra Datos y Estadísticas para una Marca persistida', (): void => {
    const sections: readonly MarcaSectionDefinition[] = getMarcaSectionDefinitions(true);

    expect(sections).toEqual([
      {
        id: 'data',
        label: 'DATOS',
      },
      {
        id: 'statistics',
        label: 'ESTADÍSTICAS',
      },
    ]);
  });
});
