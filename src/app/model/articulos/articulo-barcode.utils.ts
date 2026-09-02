import type { ArticuloCodigoBarrasDraft } from '@model/articulos/articulo-draft.interface';

/**
 * Añade un código de barras adicional normalizado.
 */
export function appendArticuloBarcode(
  codigos: readonly ArticuloCodigoBarrasDraft[],
  codigo: string,
): readonly ArticuloCodigoBarrasDraft[] {
  const normalizedCode: string = codigo.trim();

  if (normalizedCode === '') {
    return codigos;
  }

  return [
    ...codigos,
    {
      id: null,
      codigo: normalizedCode,
    },
  ];
}

/**
 * Elimina un código adicional del draft.
 */
export function removeArticuloBarcode(
  codigos: readonly ArticuloCodigoBarrasDraft[],
  index: number,
): readonly ArticuloCodigoBarrasDraft[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= codigos.length) {
    return codigos;
  }

  return codigos.filter(
    (_codigo: ArticuloCodigoBarrasDraft, currentIndex: number): boolean => currentIndex !== index,
  );
}

/**
 * Comprueba las incoherencias locales de la colección.
 */
export function validateArticuloBarcodes(
  codigos: readonly ArticuloCodigoBarrasDraft[],
  localizador: number | null,
  accesoDirecto: number | null,
): string | null {
  const seenCodes: Set<string> = new Set<string>();

  for (const codigo of codigos) {
    const normalizedCode: string = codigo.codigo.trim();

    if (normalizedCode === '') {
      return 'Los códigos de barras no pueden estar vacíos.';
    }

    if (seenCodes.has(normalizedCode)) {
      return `El código "${normalizedCode}" está repetido en el artículo.`;
    }

    seenCodes.add(normalizedCode);

    const numericCode: number | null =
      /^\d+$/.test(normalizedCode) && Number.isSafeInteger(Number(normalizedCode))
        ? Number(normalizedCode)
        : null;

    if (numericCode !== null && numericCode === localizador) {
      return 'Un código adicional no puede coincidir con el localizador.';
    }

    if (numericCode !== null && numericCode === accesoDirecto) {
      return 'Un código adicional no puede coincidir con el acceso directo.';
    }
  }

  return null;
}
