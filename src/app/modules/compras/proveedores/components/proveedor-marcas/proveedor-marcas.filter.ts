import type Marca from '@model/marcas/marca.model';
import { normalizeTextForSearch } from '@utils/string.utils';

/**
 * Filtra y ordena las Marcas disponibles para un Proveedor.
 *
 * Las seleccionadas aparecen primero y cada grupo
 * se ordena alfabéticamente por nombre.
 */
export default function filterProveedorMarcas(
  marcas: readonly Marca[],
  selectedIds: readonly number[],
  query: string,
): readonly Marca[] {
  const normalizedQuery: string = normalizeTextForSearch(query);

  const selectedSet: ReadonlySet<number> = new Set(selectedIds);

  return marcas
    .filter(
      (marca: Marca): boolean =>
        normalizedQuery === '' || normalizeTextForSearch(marca.nombre).includes(normalizedQuery),
    )
    .toSorted((left: Marca, right: Marca): number => {
      const leftSelected: boolean = left.id !== null && selectedSet.has(left.id);

      const rightSelected: boolean = right.id !== null && selectedSet.has(right.id);

      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }

      return left.nombre.localeCompare(right.nombre, 'es', {
        sensitivity: 'base',
      });
    });
}
