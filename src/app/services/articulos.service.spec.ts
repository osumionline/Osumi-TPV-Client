import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticulosService from '@services/articulos.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('ArticulosService', (): void => {
  let service: ArticulosService;

  beforeEach((): void => {
    service = new ArticulosService();
  });

  it('starts with an empty workspace', (): void => {
    expect(service.tabs()).toEqual([]);
    expect(service.activeTabId()).toBeNull();
    expect(service.activeTab()).toBeNull();
    expect(service.hasTabs()).toBe(false);
  });

  it('allows several independent new article drafts', (): void => {
    const first: ArticuloWorkspaceTab = service.crearBorrador();
    const second: ArticuloWorkspaceTab = service.crearBorrador();

    expect(service.tabs()).toHaveLength(2);
    expect(first.idTemporal).not.toBe(second.idTemporal);
    expect(first.draft.id).toBeNull();
    expect(second.draft.id).toBeNull();
    expect(service.activeTabId()).toBe(second.idTemporal);
    expect(service.activeTab()).toBe(second);
  });

  it('opens only one tab for the same persisted article', (): void => {
    const articulo: ArticuloInterface = createArticulo();
    const first: ArticuloWorkspaceTab = service.abrirArticulo(articulo);

    service.actualizarDraft(first.idTemporal, {
      nombre: 'Nombre modificado',
    });

    const reopened: ArticuloWorkspaceTab = service.abrirArticulo({
      ...articulo,
      nombre: 'Nombre recibido otra vez desde backend',
    });

    expect(service.tabs()).toHaveLength(1);
    expect(reopened.idTemporal).toBe(first.idTemporal);
    expect(reopened.draft.nombre).toBe('Nombre modificado');
    expect(reopened.dirty).toBe(true);
    expect(service.activeTabId()).toBe(first.idTemporal);
  });

  it('marks a tab dirty only while its draft differs from the base snapshot', (): void => {
    const tab: ArticuloWorkspaceTab = service.abrirArticulo(createArticulo());

    const modified: ArticuloWorkspaceTab = service.actualizarDraft(tab.idTemporal, {
      nombre: 'Cambio',
    });

    expect(modified.dirty).toBe(true);

    const restoredValue: ArticuloWorkspaceTab = service.actualizarDraft(tab.idTemporal, {
      nombre: tab.baseSnapshot.nombre,
    });

    expect(restoredValue.dirty).toBe(false);
  });

  it('ignores category order when calculating dirty state', (): void => {
    const tab: ArticuloWorkspaceTab = service.abrirArticulo(
      createArticulo({
        idsCategorias: [2, 4],
      }),
    );

    const updated: ArticuloWorkspaceTab = service.actualizarDraft(tab.idTemporal, {
      idsCategorias: [4, 2],
    });

    expect(updated.dirty).toBe(false);
  });

  it('restores the complete base snapshot when changes are cancelled', (): void => {
    const tab: ArticuloWorkspaceTab = service.abrirArticulo(createArticulo());

    service.actualizarDraft(tab.idTemporal, {
      nombre: 'Otro nombre',
      idsCategorias: [7, 8],
      stock: 99,
    });

    const cancelled: ArticuloWorkspaceTab = service.cancelarCambios(tab.idTemporal);

    expect(cancelled.draft).toEqual(tab.baseSnapshot);
    expect(cancelled.dirty).toBe(false);
  });

  it('selects the closest tab after closing the active tab', (): void => {
    const first: ArticuloWorkspaceTab = service.crearBorrador();
    const second: ArticuloWorkspaceTab = service.crearBorrador();
    const third: ArticuloWorkspaceTab = service.crearBorrador();

    service.seleccionarTab(second.idTemporal);
    service.cerrarTab(second.idTemporal);

    expect(service.tabs()).toEqual([first, third]);
    expect(service.activeTabId()).toBe(third.idTemporal);

    service.cerrarTab(third.idTemporal);

    expect(service.activeTabId()).toBe(first.idTemporal);

    service.cerrarTab(first.idTemporal);

    expect(service.activeTabId()).toBeNull();
    expect(service.activeTab()).toBeNull();
  });

  it('establishes a fresh base snapshot after a successful save', (): void => {
    const tab: ArticuloWorkspaceTab = service.crearBorrador();

    service.actualizarDraft(tab.idTemporal, {
      nombre: 'Artículo todavía no guardado',
    });

    const persistedArticulo: ArticuloInterface = createArticulo({
      id: 25,
      publicId: 'article-public-id-25',
      localizador: 260025,
      nombre: 'Artículo guardado',
    });

    const persistedTab: ArticuloWorkspaceTab = service.reemplazarTrasGuardado(
      tab.idTemporal,
      persistedArticulo,
    );

    expect(persistedTab.idTemporal).toBe(tab.idTemporal);
    expect(persistedTab.draft.id).toBe(25);
    expect(persistedTab.draft.localizador).toBe(260025);
    expect(persistedTab.draft.nombre).toBe('Artículo guardado');
    expect(persistedTab.baseSnapshot).toEqual(persistedTab.draft);
    expect(persistedTab.dirty).toBe(false);

    const reopened: ArticuloWorkspaceTab = service.abrirArticulo(persistedArticulo);

    expect(reopened.idTemporal).toBe(tab.idTemporal);
    expect(service.tabs()).toHaveLength(1);
  });

  it('keeps an independent active section for each article tab', (): void => {
    const first: ArticuloWorkspaceTab = service.crearBorrador();
    const second: ArticuloWorkspaceTab = service.crearBorrador();

    service.seleccionarSeccion(first.idTemporal, 'history');
    service.seleccionarSeccion(second.idTemporal, 'notes');

    expect(
      service
        .tabs()
        .find((tab: ArticuloWorkspaceTab): boolean => tab.idTemporal === first.idTemporal)
        ?.activeSection,
    ).toBe('history');
    expect(
      service
        .tabs()
        .find((tab: ArticuloWorkspaceTab): boolean => tab.idTemporal === second.idTemporal)
        ?.activeSection,
    ).toBe('notes');
  });

  it('returns to general when online sale is disabled while WEB is active', (): void => {
    const tab: ArticuloWorkspaceTab = service.abrirArticulo(
      createArticulo({
        ventaOnline: true,
      }),
    );

    service.seleccionarSeccion(tab.idTemporal, 'web');

    const updated: ArticuloWorkspaceTab = service.actualizarDraft(tab.idTemporal, {
      ventaOnline: false,
    });

    expect(updated.activeSection).toBe('general');
    expect(updated.draft.ventaOnline).toBe(false);
  });
});

function createArticulo(overrides: Partial<ArticuloInterface> = {}): ArticuloInterface {
  return {
    id: 1,
    publicId: 'article-public-id-1',
    localizador: 260001,
    nombre: 'Artículo de prueba',
    idMarca: 2,
    idProveedor: 3,
    idsCategorias: [4, 5],
    referencia: 'REF-1',
    precioAlbaranMicros: 1_000_000,
    pucMicros: 1_262_000,
    pvpCents: 200,
    pvpDescuentoCents: null,
    ivaBps: 2100,
    reBps: 520,
    margenMicroporcentaje: 36_900_000,
    margenDescuentoMicroporcentaje: null,
    stock: 10,
    stockMin: 2,
    stockMax: 20,
    loteOptimo: 5,
    ventaOnline: false,
    mostrarEnWeb: false,
    descripcionCorta: null,
    descripcionLarga: null,
    observaciones: null,
    mostrarObservacionesPedidos: false,
    mostrarObservacionesVentas: false,
    accesoDirecto: null,
    codigosBarras: [
      {
        id: 10,
        publicId: 'barcode-public-id-10',
        codigo: '260001',
        porDefecto: true,
      },
      {
        id: 11,
        publicId: 'barcode-public-id-11',
        codigo: '8430000000001',
        porDefecto: false,
      },
    ],
    fotos: [],
    ...overrides,
  };
}
