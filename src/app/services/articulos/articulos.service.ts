import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type {
  ArticuloEstadisticasConsulta,
  ArticuloEstadisticasResultado,
} from '@desktop-contracts/articulos/articulo-estadisticas.interface';
import type {
  ArticuloHistoricoConsulta,
  ArticuloHistoricoResultado,
} from '@desktop-contracts/articulos/articulo-historico.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type {
  ArticuloCodigoBarrasDraft,
  ArticuloDraft,
  ArticuloDraftPatch,
} from '@model/articulos/articulo-draft.interface';
import {
  areArticuloDraftsEqual,
  cloneArticuloDraft,
  createArticuloDraftFromInterface,
  createDuplicatedArticuloDraft,
  createEmptyArticuloDraft,
} from '@model/articulos/articulo-draft.utils';
import { getPendingArticuloStagingIds } from '@model/articulos/articulo-photo.utils';
import { createArticuloSaveCommand } from '@model/articulos/articulo-save.utils';
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
   * Crea una ficha nueva copiando la configuración
   * reutilizable de un artículo persistido.
   */
  duplicar(idTemporal: string): ArticuloWorkspaceTab {
    const sourceTab: ArticuloWorkspaceTab = this.requireTab(idTemporal);

    if (sourceTab.draft.id === null) {
      throw new Error('Solo se puede duplicar un artículo ya guardado.');
    }

    if (sourceTab.dirty) {
      throw new Error('Guarda o cancela los cambios antes de duplicar el artículo.');
    }

    const baseSnapshot: ArticuloDraft = createEmptyArticuloDraft();
    const draft: ArticuloDraft = createDuplicatedArticuloDraft(sourceTab.draft);
    const tab: ArticuloWorkspaceTab = {
      idTemporal: crypto.randomUUID(),
      draft,
      baseSnapshot,
      dirty: true,
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
   * Recupera una página del histórico persistido.
   */
  getHistorico(consulta: ArticuloHistoricoConsulta): Promise<ArticuloHistoricoResultado> {
    return window.osumiDesktop.articulos.getHistorico(consulta);
  }

  /**
   * Recupera las estadísticas persistidas de ventas
   * para un artículo y período concretos.
   */
  getEstadisticas(consulta: ArticuloEstadisticasConsulta): Promise<ArticuloEstadisticasResultado> {
    return window.osumiDesktop.articulos.getEstadisticas(consulta);
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
   * Persiste una ficha y sustituye su estado por
   * la versión definitiva devuelta por backend.
   */
  async guardar(idTemporal: string): Promise<ArticuloWorkspaceTab> {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);
    const articulo: ArticuloInterface = await window.osumiDesktop.articulos.save(
      createArticuloSaveCommand(tab.draft),
    );

    return this.reemplazarTrasGuardado(idTemporal, articulo);
  }

  /**
   * Da de baja el artículo persistido y cierra su ficha
   * cuando la operación termina correctamente.
   */
  async darDeBaja(idTemporal: string): Promise<void> {
    const tab: ArticuloWorkspaceTab = this.requireTab(idTemporal);
    const idArticulo: number | null = tab.draft.id;

    if (idArticulo === null) {
      throw new Error('Solo se puede dar de baja un artículo ya guardado.');
    }

    if (tab.dirty) {
      throw new Error('Guarda o cancela los cambios antes de dar de baja el artículo.');
    }

    await window.osumiDesktop.articulos.deactivate(idArticulo);

    this.cerrarTab(idTemporal);
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
   * Actualiza las fichas abiertas después de una
   * persistencia externa realizada desde Inventario.
   */
  async sincronizarInventarioPersistido(idsArticulos: readonly number[]): Promise<void> {
    const ids: readonly number[] = [...new Set<number>(idsArticulos)].filter(
      (idArticulo: number): boolean => this.findByArticuloId(idArticulo) !== null,
    );

    for (const idArticulo of ids) {
      const articulo: ArticuloInterface | null =
        await window.osumiDesktop.articulos.getById(idArticulo);

      if (articulo === null) {
        continue;
      }

      this.reconcileInventarioPersistence(articulo);
    }
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

  /**
   * Incorpora valores persistidos externamente conservando
   * posibles cambios locales de la ficha abierta.
   */
  private reconcileInventarioPersistence(articulo: ArticuloInterface): void {
    const tab: ArticuloWorkspaceTab | null = this.findByArticuloId(articulo.id);

    if (tab === null) {
      return;
    }

    const persisted: ArticuloDraft = createArticuloDraftFromInterface(articulo);

    const draft: ArticuloDraft = cloneArticuloDraft({
      ...tab.draft,
      idsCategorias: this.mergeExternalValue(
        tab.draft.idsCategorias,
        tab.baseSnapshot.idsCategorias,
        persisted.idsCategorias,
      ),
      precioAlbaranMicros: this.mergeExternalValue(
        tab.draft.precioAlbaranMicros,
        tab.baseSnapshot.precioAlbaranMicros,
        persisted.precioAlbaranMicros,
      ),
      pucMicros: this.mergeExternalValue(
        tab.draft.pucMicros,
        tab.baseSnapshot.pucMicros,
        persisted.pucMicros,
      ),
      pvpCents: this.mergeExternalValue(
        tab.draft.pvpCents,
        tab.baseSnapshot.pvpCents,
        persisted.pvpCents,
      ),
      margenMicroporcentaje: this.mergeExternalValue(
        tab.draft.margenMicroporcentaje,
        tab.baseSnapshot.margenMicroporcentaje,
        persisted.margenMicroporcentaje,
      ),
      stock: this.mergeExternalValue(tab.draft.stock, tab.baseSnapshot.stock, persisted.stock),
      codigosBarrasAdicionales: this.mergeExternalBarcodes(
        tab.draft.codigosBarrasAdicionales,
        tab.baseSnapshot.codigosBarrasAdicionales,
        persisted.codigosBarrasAdicionales,
      ),
    });

    const baseSnapshot: ArticuloDraft = cloneArticuloDraft({
      ...tab.baseSnapshot,
      idsCategorias: persisted.idsCategorias,
      precioAlbaranMicros: persisted.precioAlbaranMicros,
      pucMicros: persisted.pucMicros,
      pvpCents: persisted.pvpCents,
      margenMicroporcentaje: persisted.margenMicroporcentaje,
      stock: persisted.stock,
      codigosBarrasAdicionales: persisted.codigosBarrasAdicionales,
    });

    this.replaceTab({
      ...tab,
      draft,
      baseSnapshot,
      dirty: !areArticuloDraftsEqual(draft, baseSnapshot),
    });
  }

  /**
   * Sustituye un valor por la versión externa solo
   * cuando no contenía una edición local pendiente.
   */
  private mergeExternalValue<T>(draftValue: T, snapshotValue: T, persistedValue: T): T {
    return JSON.stringify(draftValue) === JSON.stringify(snapshotValue)
      ? persistedValue
      : draftValue;
  }

  /**
   * Incorpora códigos añadidos externamente sin eliminar
   * modificaciones locales pendientes del workspace.
   */
  private mergeExternalBarcodes(
    draft: readonly ArticuloCodigoBarrasDraft[],
    snapshot: readonly ArticuloCodigoBarrasDraft[],
    persisted: readonly ArticuloCodigoBarrasDraft[],
  ): readonly ArticuloCodigoBarrasDraft[] {
    if (JSON.stringify(draft) === JSON.stringify(snapshot)) {
      return persisted;
    }

    const snapshotIds: Set<number> = new Set<number>(
      snapshot.flatMap((codigo: ArticuloCodigoBarrasDraft): readonly number[] =>
        codigo.id === null ? [] : [codigo.id],
      ),
    );

    const result: ArticuloCodigoBarrasDraft[] = draft.map(
      (codigo: ArticuloCodigoBarrasDraft): ArticuloCodigoBarrasDraft => ({
        ...codigo,
      }),
    );

    const currentIds: Set<number> = new Set<number>(
      result.flatMap((codigo: ArticuloCodigoBarrasDraft): readonly number[] =>
        codigo.id === null ? [] : [codigo.id],
      ),
    );

    for (const codigo of persisted) {
      if (codigo.id === null || snapshotIds.has(codigo.id) || currentIds.has(codigo.id)) {
        continue;
      }

      result.push({
        ...codigo,
      });
    }

    return result;
  }
}
