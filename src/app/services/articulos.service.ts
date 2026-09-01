import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type { ArticuloDraft, ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import {
  areArticuloDraftsEqual,
  cloneArticuloDraft,
  createArticuloDraftFromInterface,
  createEmptyArticuloDraft,
} from '@model/articulos/articulo-draft.utils';
import { getPendingArticuloStagingIds } from '@model/articulos/articulo-photo.utils';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

/**
 * Mantiene las fichas de Artículos abiertas durante toda la sesión de la aplicación.
 */
@Service()
export default class ArticulosService {
  private readonly tabsSignal: WritableSignal<readonly ArticuloWorkspaceTab[]> = signal<
    readonly ArticuloWorkspaceTab[]
  >([]);
  private readonly activeTabIdSignal: WritableSignal<string | null> = signal<string | null>(null);

  readonly tabs: Signal<readonly ArticuloWorkspaceTab[]> = this.tabsSignal.asReadonly();
  readonly activeTabId: Signal<string | null> = this.activeTabIdSignal.asReadonly();
  readonly hasTabs: Signal<boolean> = computed((): boolean => this.tabs().length > 0);
  readonly activeTab: Signal<ArticuloWorkspaceTab | null> = computed(
    (): ArticuloWorkspaceTab | null => {
      const activeTabId: string | null = this.activeTabId();

      if (activeTabId === null) {
        return null;
      }

      return this.findByTemporalId(activeTabId);
    },
  );

  /**
   * Crea una nueva ficha temporal y la convierte en la pestaña activa.
   */
  crearBorrador(): ArticuloWorkspaceTab {
    const draft: ArticuloDraft = createEmptyArticuloDraft();
    const tab: ArticuloWorkspaceTab = {
      idTemporal: crypto.randomUUID(),
      draft,
      baseSnapshot: cloneArticuloDraft(draft),
      dirty: false,
      activeSection: 'general',
    };

    this.tabsSignal.update(
      (tabs: readonly ArticuloWorkspaceTab[]): readonly ArticuloWorkspaceTab[] => [...tabs, tab],
    );
    this.activeTabIdSignal.set(tab.idTemporal);

    return tab;
  }

  /**
   * Carga un artículo por su identificador.
   *
   * Cuando la operación parte de una ficha nueva, esa ficha
   * se reutiliza para mostrar el artículo encontrado.
   */
  async cargarPorId(
    idArticulo: number,
    sourceTabId: string | null = null,
  ): Promise<ArticuloWorkspaceTab | null> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      return null;
    }

    const existingTab: ArticuloWorkspaceTab | null = this.findByArticuloId(idArticulo);

    if (existingTab !== null) {
      await this.discardSourceDraftStaging(sourceTabId);
      this.closeSourceDraftIfNeeded(sourceTabId, existingTab.idTemporal);
      this.activeTabIdSignal.set(existingTab.idTemporal);

      return existingTab;
    }

    const articulo: ArticuloInterface | null =
      await window.osumiDesktop.articulos.getById(idArticulo);

    if (articulo === null) {
      return null;
    }

    await this.discardSourceDraftStaging(sourceTabId);

    return this.abrirArticulo(articulo, sourceTabId);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras.
   *
   * Cuando la operación parte de una ficha nueva, reutiliza
   * esa ficha para cargar el artículo encontrado.
   */
  async resolverPorCodigo(
    codigo: string,
    sourceTabId: string | null = null,
  ): Promise<ArticuloWorkspaceTab | null> {
    const normalizedCode: string = codigo.trim();

    if (normalizedCode.length === 0) {
      return null;
    }

    const articulo: ArticuloInterface | null =
      await window.osumiDesktop.articulos.resolveByCode(normalizedCode);

    if (articulo === null) {
      return null;
    }

    await this.discardSourceDraftStaging(sourceTabId);

    return this.abrirArticulo(articulo, sourceTabId);
  }

  /**
   * Obtiene la lista global de accesos directos.
   */
  getAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoInterface[]> {
    return window.osumiDesktop.articulos.getAccesosDirectos();
  }

  /**
   * Persiste un acceso directo y sincroniza cualquier ficha
   * abierta del artículo afectado.
   */
  async setAccesoDirecto(idArticulo: number, accesoDirecto: number | null): Promise<void> {
    await window.osumiDesktop.articulos.setAccesoDirecto({
      idArticulo,
      accesoDirecto,
    });

    this.syncPersistedAccesoDirecto(idArticulo, accesoDirecto);
  }

  /**
   * Abre un artículo persistido o activa su pestaña si ya estaba abierta.
   */
  abrirArticulo(
    articulo: ArticuloInterface,
    sourceTabId: string | null = null,
  ): ArticuloWorkspaceTab {
    const existingTab: ArticuloWorkspaceTab | null = this.findByArticuloId(articulo.id);

    if (existingTab !== null) {
      this.closeSourceDraftIfNeeded(sourceTabId, existingTab.idTemporal);
      this.activeTabIdSignal.set(existingTab.idTemporal);

      return existingTab;
    }

    const draft: ArticuloDraft = createArticuloDraftFromInterface(articulo);
    const sourceTab: ArticuloWorkspaceTab | null =
      sourceTabId === null ? null : this.findByTemporalId(sourceTabId);

    if (sourceTab !== null && sourceTab.draft.id === null) {
      const updatedTab: ArticuloWorkspaceTab = {
        ...sourceTab,
        draft,
        baseSnapshot: cloneArticuloDraft(draft),
        dirty: false,
        activeSection: 'general',
      };

      this.replaceTab(updatedTab);
      this.activeTabIdSignal.set(updatedTab.idTemporal);

      return updatedTab;
    }

    const tab: ArticuloWorkspaceTab = {
      idTemporal: crypto.randomUUID(),
      draft,
      baseSnapshot: cloneArticuloDraft(draft),
      dirty: false,
      activeSection: 'general',
    };

    this.tabsSignal.update(
      (tabs: readonly ArticuloWorkspaceTab[]): readonly ArticuloWorkspaceTab[] => [...tabs, tab],
    );
    this.activeTabIdSignal.set(tab.idTemporal);

    return tab;
  }

  /**
   * Selecciona una pestaña existente.
   */
  seleccionarTab(idTemporal: string): void {
    if (this.findByTemporalId(idTemporal) === null) {
      throw new Error('No se puede seleccionar una pestaña de artículo que no está abierta.');
    }

    this.activeTabIdSignal.set(idTemporal);
  }

  /**
   * Cambia la sección interna activa de una ficha.
   */
  seleccionarSeccion(idTemporal: string, section: ArticuloWorkspaceSection): ArticuloWorkspaceTab {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);

    if (section === 'web' && !tab.draft.ventaOnline) {
      throw new Error('La sección WEB solo está disponible para artículos con venta online.');
    }

    const updatedTab: ArticuloWorkspaceTab = {
      ...tab,
      activeSection: section,
    };

    this.replaceTab(updatedTab);

    return updatedTab;
  }

  /**
   * Cierra una pestaña y selecciona la pestaña contigua cuando era la activa.
   *
   * La confirmación de cambios pendientes pertenece a la capa de UI.
   */
  cerrarTab(idTemporal: string): void {
    const currentTabs: readonly ArticuloWorkspaceTab[] = this.tabs();
    const index: number = currentTabs.findIndex(
      (tab: ArticuloWorkspaceTab): boolean => tab.idTemporal === idTemporal,
    );

    if (index === -1) {
      return;
    }

    const tabs: readonly ArticuloWorkspaceTab[] = currentTabs.filter(
      (tab: ArticuloWorkspaceTab): boolean => tab.idTemporal !== idTemporal,
    );

    this.tabsSignal.set(tabs);

    if (this.activeTabId() !== idTemporal) {
      return;
    }

    const nextTab: ArticuloWorkspaceTab | undefined = tabs[index] ?? tabs[index - 1];

    this.activeTabIdSignal.set(nextTab?.idTemporal ?? null);
  }

  /**
   * Elimina los temporales pertenecientes a cambios
   * descartados antes de cerrar una ficha.
   */
  async cerrarTabDescartandoCambios(idTemporal: string): Promise<void> {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);

    await this.discardPendingStaging(tab);
    this.cerrarTab(idTemporal);
  }

  /**
   * Actualiza los campos editables de una ficha y recalcula su estado dirty.
   */
  actualizarDraft(idTemporal: string, patch: ArticuloDraftPatch): ArticuloWorkspaceTab {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);
    const draft: ArticuloDraft = cloneArticuloDraft({
      ...tab.draft,
      ...patch,
    });
    const updatedTab: ArticuloWorkspaceTab = {
      ...tab,
      draft,
      dirty: !areArticuloDraftsEqual(draft, tab.baseSnapshot),
      activeSection:
        tab.activeSection === 'web' && !draft.ventaOnline ? 'general' : tab.activeSection,
    };

    this.replaceTab(updatedTab);

    return updatedTab;
  }

  /**
   * Descarta las modificaciones de una ficha y restaura su snapshot base.
   */
  cancelarCambios(idTemporal: string): ArticuloWorkspaceTab {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);
    const draft: ArticuloDraft = cloneArticuloDraft(tab.baseSnapshot);
    const updatedTab: ArticuloWorkspaceTab = {
      ...tab,
      draft,
      dirty: false,
      activeSection:
        tab.activeSection === 'web' && !draft.ventaOnline ? 'general' : tab.activeSection,
    };

    this.replaceTab(updatedTab);

    return updatedTab;
  }

  /**
   * Descarta las imágenes temporales y después
   * restaura el snapshot base de la ficha.
   */
  async descartarCambios(idTemporal: string): Promise<ArticuloWorkspaceTab> {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);

    await this.discardPendingStaging(tab);

    return this.cancelarCambios(idTemporal);
  }

  /**
   * Sustituye el contenido de una pestaña por el artículo fresco devuelto
   * después de una persistencia correcta y establece un nuevo snapshot base.
   */
  reemplazarTrasGuardado(idTemporal: string, articulo: ArticuloInterface): ArticuloWorkspaceTab {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);
    const duplicateTab: ArticuloWorkspaceTab | null = this.findByArticuloId(articulo.id);

    if (duplicateTab !== null && duplicateTab.idTemporal !== idTemporal) {
      throw new Error('El artículo guardado ya está abierto en otra pestaña.');
    }

    const draft: ArticuloDraft = createArticuloDraftFromInterface(articulo);
    const updatedTab: ArticuloWorkspaceTab = {
      ...tab,
      draft,
      baseSnapshot: cloneArticuloDraft(draft),
      dirty: false,
      activeSection:
        tab.activeSection === 'web' && !draft.ventaOnline ? 'general' : tab.activeSection,
    };

    this.replaceTab(updatedTab);

    return updatedTab;
  }

  /**
   * Busca la pestaña correspondiente a un artículo persistido.
   */
  findByArticuloId(idArticulo: number): ArticuloWorkspaceTab | null {
    return (
      this.tabs().find((tab: ArticuloWorkspaceTab): boolean => tab.draft.id === idArticulo) ?? null
    );
  }

  /**
   * Elimina los temporales de una ficha nueva que
   * va a ser sustituida por un artículo existente.
   */
  private async discardSourceDraftStaging(sourceTabId: string | null): Promise<void> {
    if (sourceTabId === null) {
      return;
    }

    const sourceTab: ArticuloWorkspaceTab | null = this.findByTemporalId(sourceTabId);

    if (sourceTab === null || sourceTab.draft.id !== null) {
      return;
    }

    await this.discardPendingStaging(sourceTab);
  }

  /**
   * Descarta todas las imágenes staged que pertenecen
   * únicamente a los cambios pendientes de una ficha.
   */
  private async discardPendingStaging(tab: ArticuloWorkspaceTab): Promise<void> {
    const stagingIds: readonly string[] = getPendingArticuloStagingIds(
      tab.draft.fotos,
      tab.baseSnapshot.fotos,
    );

    await Promise.all(
      stagingIds.map((stagingId: string): Promise<void> =>
        window.osumiDesktop.files.discardStagedImage(stagingId),
      ),
    );
  }

  /**
   * Elimina la ficha origen cuando es un borrador nuevo
   * que ha sido utilizado para localizar otro artículo.
   */
  private closeSourceDraftIfNeeded(sourceTabId: string | null, destinationTabId: string): void {
    if (sourceTabId === null || sourceTabId === destinationTabId) {
      return;
    }

    const sourceTab: ArticuloWorkspaceTab | null = this.findByTemporalId(sourceTabId);

    if (sourceTab === null || sourceTab.draft.id !== null) {
      return;
    }

    this.cerrarTab(sourceTabId);
  }

  /**
   * Aplica un acceso directo ya persistido tanto al draft
   * como al snapshot base, preservando otros cambios locales.
   */
  private syncPersistedAccesoDirecto(idArticulo: number, accesoDirecto: number | null): void {
    const tab: ArticuloWorkspaceTab | null = this.findByArticuloId(idArticulo);

    if (tab === null) {
      return;
    }

    const draft: ArticuloDraft = cloneArticuloDraft({
      ...tab.draft,
      accesoDirecto,
    });
    const baseSnapshot: ArticuloDraft = cloneArticuloDraft({
      ...tab.baseSnapshot,
      accesoDirecto,
    });
    const updatedTab: ArticuloWorkspaceTab = {
      ...tab,
      draft,
      baseSnapshot,
      dirty: !areArticuloDraftsEqual(draft, baseSnapshot),
    };

    this.replaceTab(updatedTab);
  }

  /**
   * Busca una pestaña mediante su identidad temporal.
   */
  private findByTemporalId(idTemporal: string): ArticuloWorkspaceTab | null {
    return (
      this.tabs().find((tab: ArticuloWorkspaceTab): boolean => tab.idTemporal === idTemporal) ??
      null
    );
  }

  /**
   * Obtiene una pestaña abierta o lanza un error si no existe.
   */
  private requireTab(idTemporal: string): ArticuloWorkspaceTab {
    const tab: ArticuloWorkspaceTab | null = this.findByTemporalId(idTemporal);

    if (tab === null) {
      throw new Error('La pestaña de artículo indicada no está abierta.');
    }

    return tab;
  }

  /**
   * Sustituye una pestaña conservando su posición dentro del workspace.
   */
  private replaceTab(updatedTab: ArticuloWorkspaceTab): void {
    this.tabsSignal.update(
      (tabs: readonly ArticuloWorkspaceTab[]): readonly ArticuloWorkspaceTab[] =>
        tabs.map((tab: ArticuloWorkspaceTab): ArticuloWorkspaceTab =>
          tab.idTemporal === updatedTab.idTemporal ? updatedTab : tab,
        ),
    );
  }
}
