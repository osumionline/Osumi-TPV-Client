import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type AlmacenSection from '@model/almacen/almacen-section.type';
import type {
  InventarioDraftEntry,
  InventarioDraftValues,
} from '@model/almacen/inventario/inventario-draft.interface';
import type InventarioWorkspaceState from '@model/almacen/inventario/inventario-workspace.interface';

/**
 * Mantiene el estado visual de Almacén durante
 * toda la sesión actual de la aplicación.
 */
@Service()
export default class AlmacenWorkspaceService {
  private readonly activeSectionSignal: WritableSignal<AlmacenSection> =
    signal<AlmacenSection>('inventory');

  private inventarioState: InventarioWorkspaceState | null = null;

  readonly activeSection: Signal<AlmacenSection> = this.activeSectionSignal.asReadonly();

  /**
   * Cambia la sección activa conservándola durante la sesión.
   */
  setActiveSection(section: AlmacenSection): void {
    this.activeSectionSignal.set(section);
  }

  /**
   * Recupera una copia del último estado conocido de Inventario.
   */
  getInventarioState(): InventarioWorkspaceState | null {
    if (this.inventarioState === null) {
      return null;
    }

    return this.cloneInventarioState(this.inventarioState);
  }

  /**
   * Conserva el estado actual de Inventario durante la sesión.
   */
  setInventarioState(state: InventarioWorkspaceState): void {
    this.inventarioState = this.cloneInventarioState(state);
  }

  /**
   * Copia el estado de Inventario evitando compartir
   * colecciones mutables entre distintas instancias del componente.
   */
  private cloneInventarioState(state: InventarioWorkspaceState): InventarioWorkspaceState {
    return {
      ...state,
      selectedColumns: [...state.selectedColumns],
      drafts: this.cloneDrafts(state.drafts),
    };
  }

  /**
   * Copia los drafts y sus colecciones internas.
   */
  private cloneDrafts(
    drafts: ReadonlyMap<number, InventarioDraftEntry>,
  ): ReadonlyMap<number, InventarioDraftEntry> {
    const result: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>();

    for (const [idArticulo, entry] of drafts) {
      result.set(idArticulo, {
        snapshot: this.cloneDraftValues(entry.snapshot),
        draft: this.cloneDraftValues(entry.draft),
        filterKeys: [...entry.filterKeys],
      });
    }

    return result;
  }

  /**
   * Copia los valores de un draft sin compartir categorías.
   */
  private cloneDraftValues(values: InventarioDraftValues): InventarioDraftValues {
    return {
      ...values,
      idsCategorias: [...values.idsCategorias],
    };
  }
}
