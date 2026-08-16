/**
 * Normaliza un texto para realizar búsquedas humanas
 * sin distinguir mayúsculas, minúsculas ni diacríticos.
 *
 * Los valores nulos o indefinidos se consideran texto vacío.
 */
export function normalizeTextForSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .trim();
}

/**
 * Elimina los espacios exteriores de un texto opcional.
 *
 * Si después de normalizarlo queda vacío, devuelve null.
 */
export function trimToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? null : trimmedValue;
}
