import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type { ArticuloFotoDraft } from '@model/articulos/articulo-draft.interface';
import {
  appendStagedArticuloFotos,
  moveArticuloFoto,
  removeArticuloFoto,
  setArticuloFotoPrincipal,
} from '@model/articulos/articulo-photo.utils';
import { describe, expect, it } from 'vitest';

describe('articulo-photo.utils', (): void => {
  it('makes the first added photo principal', (): void => {
    const fotos: readonly ArticuloFotoDraft[] = appendStagedArticuloFotos(
      [],
      [createStagedImage('first'), createStagedImage('second')],
    );

    expect(fotos).toHaveLength(2);
    expect(fotos[0].principal).toBe(true);
    expect(fotos[1].principal).toBe(false);
    expect(fotos.map((foto: ArticuloFotoDraft): number => foto.orden)).toEqual([0, 1]);
  });

  it('preserves an existing principal when adding photos', (): void => {
    const existing: ArticuloFotoDraft = {
      id: 10,
      stagingId: null,
      originalName: 'existing.webp',
      url: 'asset://existing',
      mimeType: 'image/webp',
      sizeBytes: 1000,
      width: 800,
      height: 600,
      orden: 0,
      principal: true,
    };

    const fotos: readonly ArticuloFotoDraft[] = appendStagedArticuloFotos(
      [existing],
      [createStagedImage('new')],
    );

    expect(fotos[0].principal).toBe(true);
    expect(fotos[1].principal).toBe(false);
  });

  it('assigns another principal when the principal photo is removed', (): void => {
    const fotos: readonly ArticuloFotoDraft[] = appendStagedArticuloFotos(
      [],
      [createStagedImage('first'), createStagedImage('second')],
    );

    const result: readonly ArticuloFotoDraft[] = removeArticuloFoto(fotos, 0);

    expect(result).toHaveLength(1);
    expect(result[0].principal).toBe(true);
    expect(result[0].orden).toBe(0);
  });

  it('moves photos and recalculates their order', (): void => {
    const fotos: readonly ArticuloFotoDraft[] = appendStagedArticuloFotos(
      [],
      [createStagedImage('first'), createStagedImage('second')],
    );

    const result: readonly ArticuloFotoDraft[] = moveArticuloFoto(fotos, 1, -1);

    expect(result[0].stagingId).toBe('second');
    expect(result[1].stagingId).toBe('first');
    expect(result.map((foto: ArticuloFotoDraft): number => foto.orden)).toEqual([0, 1]);
  });

  it('changes the principal photo without changing order', (): void => {
    const fotos: readonly ArticuloFotoDraft[] = appendStagedArticuloFotos(
      [],
      [createStagedImage('first'), createStagedImage('second')],
    );

    const result: readonly ArticuloFotoDraft[] = setArticuloFotoPrincipal(fotos, 1);

    expect(result[0].principal).toBe(false);
    expect(result[1].principal).toBe(true);
    expect(result.map((foto: ArticuloFotoDraft): number => foto.orden)).toEqual([0, 1]);
  });
});

/**
 * Crea una imagen staged para las pruebas.
 */
function createStagedImage(stagingId: string): StagedImageInterface {
  return {
    stagingId,
    purpose: 'article_image',
    originalName: `${stagingId}.jpg`,
    url: `asset://${stagingId}`,
    mimeType: 'image/webp',
    sizeBytes: 1000,
    width: 800,
    height: 600,
  };
}
