import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioRowInterface,
} from '@desktop-contracts/almacen/inventario/inventario.interface';
import type {
  InventarioDirtyField,
  InventarioDraftEntry,
  InventarioDraftPatch,
  InventarioDraftValues,
} from '@model/almacen/inventario/inventario-draft.interface';

/**
 * Gestiona el ciclo de vida de los drafts editables de Inventario.
 */
export default class InventarioDraftManager {
  /**
   * Crea los valores editables iniciales de una fila persistida.
   */
  static createValues(row: InventarioRowInterface): InventarioDraftValues {
    return {
      idsCategorias: [...row.idsCategorias].sort((a: number, b: number): number => a - b),
      stock: row.stock,
      precioAlbaranMicros: row.precioAlbaranMicros,
      pucMicros: row.pucMicros,
      pvpCents: row.pvpCents,
      margenMicroporcentaje: row.margenMicroporcentaje,
      codigoAdicional: '',
    };
  }

  /**
   * Reconcilía las filas recién cargadas con los drafts existentes.
   */
  static reconcile(
    currentDrafts: ReadonlyMap<number, InventarioDraftEntry>,
    rows: readonly InventarioRowInterface[],
    filterKey: string,
  ): ReadonlyMap<number, InventarioDraftEntry> {
    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      currentDrafts,
    );

    for (const row of rows) {
      const current: InventarioDraftEntry | undefined = drafts.get(row.id);
      const persistedValues: InventarioDraftValues = this.createValues(row);

      if (current === undefined) {
        drafts.set(row.id, {
          snapshot: persistedValues,
          draft: this.cloneValues(persistedValues),
          filterKeys: [filterKey],
        });

        continue;
      }

      const filterKeys: readonly string[] = current.filterKeys.includes(filterKey)
        ? current.filterKeys
        : [...current.filterKeys, filterKey];

      if (this.getDirtyFields(current).length === 0) {
        drafts.set(row.id, {
          snapshot: persistedValues,
          draft: this.cloneValues(persistedValues),
          filterKeys,
        });

        continue;
      }

      drafts.set(row.id, {
        ...current,
        filterKeys,
      });
    }

    return drafts;
  }

  /**
   * Aplica un cambio parcial a un draft conocido.
   */
  static update(
    currentDrafts: ReadonlyMap<number, InventarioDraftEntry>,
    idArticulo: number,
    patch: InventarioDraftPatch,
  ): ReadonlyMap<number, InventarioDraftEntry> {
    const current: InventarioDraftEntry | undefined = currentDrafts.get(idArticulo);

    if (current === undefined) {
      return currentDrafts;
    }

    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      currentDrafts,
    );

    drafts.set(idArticulo, {
      ...current,
      draft: {
        ...current.draft,
        ...patch,
        idsCategorias:
          patch.idsCategorias === undefined
            ? current.draft.idsCategorias
            : [...patch.idsCategorias],
      },
    });

    return drafts;
  }

  /**
   * Restaura una fila a su snapshot persistido.
   */
  static reset(
    currentDrafts: ReadonlyMap<number, InventarioDraftEntry>,
    idArticulo: number,
  ): ReadonlyMap<number, InventarioDraftEntry> {
    const current: InventarioDraftEntry | undefined = currentDrafts.get(idArticulo);

    if (current === undefined) {
      return currentDrafts;
    }

    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      currentDrafts,
    );

    drafts.set(idArticulo, {
      ...current,
      draft: this.cloneValues(current.snapshot),
    });

    return drafts;
  }

  /**
   * Elimina los drafts de los artículos indicados.
   */
  static remove(
    currentDrafts: ReadonlyMap<number, InventarioDraftEntry>,
    idsArticulos: readonly number[],
  ): ReadonlyMap<number, InventarioDraftEntry> {
    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      currentDrafts,
    );

    for (const idArticulo of idsArticulos) {
      drafts.delete(idArticulo);
    }

    return drafts;
  }

  /**
   * Obtiene las celdas modificadas respecto al snapshot persistido.
   */
  static getDirtyFields(entry: InventarioDraftEntry): readonly InventarioDirtyField[] {
    const dirty: InventarioDirtyField[] = [];

    if (!this.sameIds(entry.snapshot.idsCategorias, entry.draft.idsCategorias)) {
      dirty.push('categoria');
    }
    if (entry.snapshot.stock !== entry.draft.stock) {
      dirty.push('stock');
    }
    if (entry.snapshot.precioAlbaranMicros !== entry.draft.precioAlbaranMicros) {
      dirty.push('precioAlbaran');
    }
    if (entry.snapshot.pucMicros !== entry.draft.pucMicros) {
      dirty.push('puc');
    }
    if (entry.snapshot.pvpCents !== entry.draft.pvpCents) {
      dirty.push('pvp');
    }
    if (entry.snapshot.margenMicroporcentaje !== entry.draft.margenMicroporcentaje) {
      dirty.push('margen');
    }
    if (entry.draft.codigoAdicional.trim().length > 0) {
      dirty.push('codigoBarras');
    }

    return dirty;
  }

  /**
   * Devuelve los drafts asociados al conjunto filtrado indicado.
   */
  static getEntriesForFilter(
    drafts: ReadonlyMap<number, InventarioDraftEntry>,
    filterKey: string | null,
  ): readonly InventarioDraftEntry[] {
    if (filterKey === null) {
      return [];
    }

    return [...drafts.values()].filter((entry: InventarioDraftEntry): boolean =>
      entry.filterKeys.includes(filterKey),
    );
  }

  /**
   * Genera la clave estable del conjunto filtrado.
   */
  static buildFilterKey(consulta: InventarioConsulta): string {
    return JSON.stringify([
      consulta.idProveedor,
      consulta.idMarca,
      consulta.idCategoria,
      consulta.texto.trim(),
      consulta.conDescuento,
    ]);
  }

  /**
   * Convierte un draft en el comando reducido de persistencia.
   */
  static createSaveCommand(idArticulo: number, entry: InventarioDraftEntry): InventarioSaveCommand {
    const codigoAdicional: string = entry.draft.codigoAdicional.trim();

    return {
      idArticulo,
      idsCategorias: [...entry.draft.idsCategorias],
      stock: entry.draft.stock,
      precioAlbaranMicros: entry.draft.precioAlbaranMicros,
      pucMicros: entry.draft.pucMicros,
      pvpCents: entry.draft.pvpCents,
      margenMicroporcentaje: entry.draft.margenMicroporcentaje,
      codigoAdicional: codigoAdicional.length === 0 ? null : codigoAdicional,
    };
  }

  /**
   * Copia valores editables sin compartir el array de categorías.
   */
  private static cloneValues(values: InventarioDraftValues): InventarioDraftValues {
    return {
      ...values,
      idsCategorias: [...values.idsCategorias],
    };
  }

  /**
   * Compara dos selecciones normalizadas de categorías.
   */
  private static sameIds(first: readonly number[], second: readonly number[]): boolean {
    return (
      first.length === second.length &&
      first.every((id: number, index: number): boolean => id === second[index])
    );
  }
}
