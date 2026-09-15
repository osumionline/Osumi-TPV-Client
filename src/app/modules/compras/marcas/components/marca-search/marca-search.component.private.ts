import type Marca from '@model/marcas/marca.model';
import { normalizeTextForSearch } from '@utils/string.utils';

/**
 * Filtra las Marcas disponibles utilizando una
 * comparación normalizada de su nombre.
 */
export function filterMarcas(marcas: readonly Marca[], query: string): readonly Marca[] {
  const normalizedQuery: string = normalizeTextForSearch(query);

  if (normalizedQuery === '') {
    return marcas;
  }

  return marcas.filter((marca: Marca): boolean =>
    normalizeTextForSearch(marca.nombre).includes(normalizedQuery),
  );
}
