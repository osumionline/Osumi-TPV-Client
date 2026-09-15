import Marca from '@model/marcas/marca.model';
import { filterMarcas } from '@modules/compras/marcas/components/marca-search/marca-search.component.private';
import { describe, expect, it } from 'vitest';

describe('marca-search.component.private', (): void => {
  it('devuelve todas las Marcas cuando no existe búsqueda', (): void => {
    const marcas: readonly Marca[] = [createMarca(1, 'Bosquimia'), createMarca(2, 'Lumen Paw')];

    expect(filterMarcas(marcas, '')).toEqual(marcas);
    expect(filterMarcas(marcas, '   ')).toEqual(marcas);
  });

  it('filtra por nombre ignorando mayúsculas y diacríticos', (): void => {
    const marcas: readonly Marca[] = [
      createMarca(1, 'Árbol Natural'),
      createMarca(2, 'Lumen Paw'),
      createMarca(3, 'Mistral Felino'),
    ];

    expect(filterMarcas(marcas, 'ARBOL').map((marca: Marca): string => marca.nombre)).toEqual([
      'Árbol Natural',
    ]);

    expect(filterMarcas(marcas, 'lumen').map((marca: Marca): string => marca.nombre)).toEqual([
      'Lumen Paw',
    ]);
  });

  it('devuelve una lista vacía cuando no encuentra coincidencias', (): void => {
    const marcas: readonly Marca[] = [createMarca(1, 'Bosquimia'), createMarca(2, 'Lumen Paw')];

    expect(filterMarcas(marcas, 'inexistente')).toEqual([]);
  });
});

/**
 * Construye una Marca persistida para las pruebas.
 */
function createMarca(id: number, nombre: string): Marca {
  const marca: Marca = new Marca();

  marca.id = id;
  marca.publicId = `marca-${id}`;
  marca.nombre = nombre;

  return marca;
}
