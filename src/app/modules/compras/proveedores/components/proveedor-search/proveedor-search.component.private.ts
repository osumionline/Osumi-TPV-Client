import type Proveedor from '@model/proveedores/proveedor.model';
import { normalizeTextForSearch } from '@utils/string.utils';

/**
 * Filtra los Proveedores disponibles utilizando
 * una comparación normalizada de su nombre.
 */
export function filterProveedores(
  proveedores: readonly Proveedor[],
  query: string,
): readonly Proveedor[] {
  const normalizedQuery: string = normalizeTextForSearch(query);

  if (normalizedQuery === '') {
    return proveedores;
  }

  return proveedores.filter((proveedor: Proveedor): boolean =>
    normalizeTextForSearch(proveedor.nombre).includes(normalizedQuery),
  );
}
