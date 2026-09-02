import type { ArticuloDraft } from '@model/articulos/articulo-draft.interface';
import { createEmptyArticuloDraft } from '@model/articulos/articulo-draft.utils';
import { createArticuloSaveCommand } from '@model/articulos/articulo-save.utils';
import { describe, expect, it } from 'vitest';

/**
 * Crea un draft mínimo válido para persistencia.
 */
function createValidDraft(): ArticuloDraft {
  return {
    ...createEmptyArticuloDraft(),
    nombre: 'Artículo prueba',
    idMarca: 10,
    ivaBps: 2100,
    reBps: 0,
  };
}

describe('articulo-save.utils', (): void => {
  it('convierte un draft válido en comando de guardado', (): void => {
    const result = createArticuloSaveCommand({
      ...createValidDraft(),
      referencia: ' REF-1 ',
      descripcionCorta: '   ',
      observaciones: ' Nota ',
    });

    expect(result).toMatchObject({
      id: null,
      nombre: 'Artículo prueba',
      idMarca: 10,
      ivaBps: 2100,
      reBps: 0,
      referencia: 'REF-1',
      descripcionCorta: null,
      observaciones: 'Nota',
    });
  });

  it('rechaza un artículo sin nombre', (): void => {
    expect((): void => {
      createArticuloSaveCommand({
        ...createValidDraft(),
        nombre: '   ',
      });
    }).toThrow('El artículo debe tener un nombre.');
  });

  it('rechaza un artículo sin marca', (): void => {
    expect((): void => {
      createArticuloSaveCommand({
        ...createValidDraft(),
        idMarca: null,
      });
    }).toThrow('Debes seleccionar una marca.');
  });

  it('rechaza un artículo sin fiscalidad', (): void => {
    expect((): void => {
      createArticuloSaveCommand({
        ...createValidDraft(),
        ivaBps: null,
      });
    }).toThrow('Debes seleccionar la fiscalidad del artículo.');
  });
});
