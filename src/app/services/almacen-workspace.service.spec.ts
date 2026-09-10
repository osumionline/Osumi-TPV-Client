import type { InventarioDraftEntry } from '@model/almacen/inventario/inventario-draft.interface';
import type InventarioWorkspaceState from '@model/almacen/inventario/inventario-workspace.interface';
import AlmacenWorkspaceService from '@services/almacen-workspace.service';

describe('AlmacenWorkspaceService', (): void => {
  it('conserva la sección activa durante la sesión', (): void => {
    const service: AlmacenWorkspaceService = new AlmacenWorkspaceService();

    expect(service.activeSection()).toBe('inventory');

    service.setActiveSection('expirations');

    expect(service.activeSection()).toBe('expirations');

    service.setActiveSection('printing');

    expect(service.activeSection()).toBe('printing');
  });

  it('conserva el estado completo de Inventario', (): void => {
    const service: AlmacenWorkspaceService = new AlmacenWorkspaceService();

    const draft: InventarioDraftEntry = {
      snapshot: {
        idsCategorias: [2, 7],
        stock: 8,
        precioAlbaranMicros: 590_000,
        pucMicros: 744_580,
        pvpCents: 100,
        margenMicroporcentaje: 255_420,
        codigoAdicional: '',
      },
      draft: {
        idsCategorias: [2, 7],
        stock: 12,
        precioAlbaranMicros: 590_000,
        pucMicros: 744_580,
        pvpCents: 100,
        margenMicroporcentaje: 255_420,
        codigoAdicional: 'EXTRA-25',
      },
      filterKeys: ['filter-a'],
    };

    const state: InventarioWorkspaceState = {
      idProveedor: 4,
      idMarca: 3,
      idCategoria: 7,
      texto: 'artículo',
      conDescuento: true,
      pagina: 3,
      num: 50,
      selectedColumns: ['localizador', 'marca', 'nombre', 'stock', 'pvp'],
      drafts: new Map<number, InventarioDraftEntry>([[25, draft]]),
    };

    service.setInventarioState(state);

    const restored: InventarioWorkspaceState | null = service.getInventarioState();

    expect(restored).toEqual(state);
    expect(restored).not.toBe(state);
    expect(restored?.selectedColumns).not.toBe(state.selectedColumns);
    expect(restored?.drafts).not.toBe(state.drafts);
    expect(restored?.drafts.get(25)).not.toBe(draft);
  });

  it('no tiene estado de Inventario antes de la primera visita', (): void => {
    const service: AlmacenWorkspaceService = new AlmacenWorkspaceService();

    expect(service.getInventarioState()).toBeNull();
  });
});
