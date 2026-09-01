import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type { ArticuloFotoDraft } from '@model/articulos/articulo-draft.interface';

/**
 * Añade imágenes staged al conjunto editable del artículo.
 */
export function appendStagedArticuloFotos(
  fotos: readonly ArticuloFotoDraft[],
  stagedImages: readonly StagedImageInterface[],
): readonly ArticuloFotoDraft[] {
  const nuevasFotos: readonly ArticuloFotoDraft[] = stagedImages.map(
    (stagedImage: StagedImageInterface): ArticuloFotoDraft => ({
      id: null,
      stagingId: stagedImage.stagingId,
      originalName: stagedImage.originalName,
      url: stagedImage.url,
      mimeType: stagedImage.mimeType,
      sizeBytes: stagedImage.sizeBytes,
      width: stagedImage.width,
      height: stagedImage.height,
      orden: 0,
      principal: false,
    }),
  );

  return normalizeArticuloFotos([...fotos, ...nuevasFotos]);
}

/**
 * Elimina una foto y normaliza orden y principal.
 */
export function removeArticuloFoto(
  fotos: readonly ArticuloFotoDraft[],
  index: number,
): readonly ArticuloFotoDraft[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= fotos.length) {
    return fotos;
  }

  return normalizeArticuloFotos(
    fotos.filter(
      (_foto: ArticuloFotoDraft, currentIndex: number): boolean => currentIndex !== index,
    ),
  );
}

/**
 * Mueve una foto una posición dentro de la galería.
 */
export function moveArticuloFoto(
  fotos: readonly ArticuloFotoDraft[],
  index: number,
  direction: -1 | 1,
): readonly ArticuloFotoDraft[] {
  const targetIndex: number = index + direction;

  if (index < 0 || index >= fotos.length || targetIndex < 0 || targetIndex >= fotos.length) {
    return fotos;
  }

  const result: ArticuloFotoDraft[] = [...fotos];

  [result[index], result[targetIndex]] = [result[targetIndex], result[index]];

  return normalizeArticuloFotos(result);
}

/**
 * Marca una única foto como principal.
 */
export function setArticuloFotoPrincipal(
  fotos: readonly ArticuloFotoDraft[],
  index: number,
): readonly ArticuloFotoDraft[] {
  if (index < 0 || index >= fotos.length) {
    return fotos;
  }

  return fotos.map((foto: ArticuloFotoDraft, currentIndex: number): ArticuloFotoDraft => ({
    ...foto,
    orden: currentIndex,
    principal: currentIndex === index,
  }));
}

/**
 * Normaliza el orden y garantiza una principal
 * cuando existe al menos una foto.
 */
function normalizeArticuloFotos(fotos: readonly ArticuloFotoDraft[]): readonly ArticuloFotoDraft[] {
  const currentPrincipalIndex: number = fotos.findIndex(
    (foto: ArticuloFotoDraft): boolean => foto.principal,
  );
  const principalIndex: number =
    fotos.length === 0 ? -1 : currentPrincipalIndex >= 0 ? currentPrincipalIndex : 0;

  return fotos.map((foto: ArticuloFotoDraft, index: number): ArticuloFotoDraft => ({
    ...foto,
    orden: index,
    principal: index === principalIndex,
  }));
}

/**
 * Obtiene los stagingId que pertenecen únicamente
 * al estado editable y no al snapshot base.
 */
export function getPendingArticuloStagingIds(
  fotos: readonly ArticuloFotoDraft[],
  baseFotos: readonly ArticuloFotoDraft[],
): readonly string[] {
  const baseStagingIds: Set<string> = new Set<string>(
    baseFotos.flatMap((foto: ArticuloFotoDraft): readonly string[] =>
      foto.stagingId === null ? [] : [foto.stagingId],
    ),
  );

  return [
    ...new Set<string>(
      fotos.flatMap((foto: ArticuloFotoDraft): readonly string[] =>
        foto.stagingId !== null && !baseStagingIds.has(foto.stagingId) ? [foto.stagingId] : [],
      ),
    ),
  ];
}
