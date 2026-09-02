import type { ArticuloDraft } from '@model/articulos/articulo-draft.interface';
import {
  createDuplicatedArticuloDraft,
  createEmptyArticuloDraft,
} from '@model/articulos/articulo-draft.utils';
import { describe, expect, it } from 'vitest';

/**
 * Crea un artículo persistido para las pruebas de duplicación.
 */
function createPersistedDraft(): ArticuloDraft {
  return {
    ...createEmptyArticuloDraft(),
    id: 25,
    publicId: 'article-public-id',
    localizador: 261234,
    nombre: 'Camiseta azul',
    idMarca: 2,
    idProveedor: 3,
    idsCategorias: [5, 8],
    referencia: 'REF-1',
    precioAlbaranMicros: 1_000_000,
    pucMicros: 1_210_000,
    pvpCents: 200,
    ivaBps: 2100,
    reBps: 0,
    stock: 12,
    stockMin: 2,
    stockMax: 20,
    loteOptimo: 5,
    ventaOnline: true,
    mostrarEnWeb: true,
    descripcionCorta: 'Descripción',
    observaciones: 'Observaciones',
    mostrarObservacionesVentas: true,
    accesoDirecto: 15,
    codigosBarrasAdicionales: [
      {
        id: 100,
        codigo: 'ABC123',
      },
    ],
    fotos: [
      {
        id: 50,
        stagingId: null,
        originalName: 'foto.jpg',
        url: 'asset://photo',
        mimeType: 'image/webp',
        sizeBytes: 1000,
        width: 800,
        height: 600,
        orden: 0,
        principal: true,
      },
    ],
  };
}

describe('createDuplicatedArticuloDraft', (): void => {
  it('resetea identidad y datos exclusivos conservando la configuración reutilizable', (): void => {
    const result: ArticuloDraft = createDuplicatedArticuloDraft(createPersistedDraft());

    expect(result).toMatchObject({
      id: null,
      publicId: null,
      localizador: null,
      nombre: 'Camiseta azul (copia)',
      referencia: '',
      stock: 0,
      accesoDirecto: null,
      codigosBarrasAdicionales: [],
      observaciones: '',
      idMarca: 2,
      idProveedor: 3,
      idsCategorias: [5, 8],
      stockMin: 2,
      stockMax: 20,
      loteOptimo: 5,
      ventaOnline: true,
      mostrarEnWeb: true,
    });

    expect(result.fotos).toEqual(createPersistedDraft().fotos);
  });

  it('rechaza una ficha todavía no persistida', (): void => {
    expect((): void => {
      createDuplicatedArticuloDraft(createEmptyArticuloDraft());
    }).toThrow('Solo se puede duplicar un artículo ya guardado.');
  });
});
