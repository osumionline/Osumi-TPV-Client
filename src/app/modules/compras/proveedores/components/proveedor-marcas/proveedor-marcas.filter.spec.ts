import Marca from '@model/marcas/marca.model';
import filterProveedorMarcas from '@modules/compras/proveedores/components/proveedor-marcas/proveedor-marcas.filter';
import { describe, expect, it } from 'vitest';

describe('filterProveedorMarcas', (): void => {
  it('muestra primero las Marcas seleccionadas y ordena cada grupo', (): void => {
    const marcas: readonly Marca[] = [
      createMarca(1, 'Zeta'),
      createMarca(2, 'Beta'),
      createMarca(3, 'Alfa'),
      createMarca(4, 'Gamma'),
    ];

    expect(
      filterProveedorMarcas(marcas, [4, 2], '').map((marca: Marca): string => marca.nombre),
    ).toEqual(['Beta', 'Gamma', 'Alfa', 'Zeta']);
  });

  it('filtra por nombre ignorando mayúsculas y diacríticos', (): void => {
    const marcas: readonly Marca[] = [
      createMarca(1, 'Árbol Natural'),
      createMarca(2, 'Bosquimia'),
      createMarca(3, 'Mistral'),
    ];

    expect(
      filterProveedorMarcas(marcas, [], 'ARBOL').map((marca: Marca): string => marca.nombre),
    ).toEqual(['Árbol Natural']);
  });

  it('mantiene las seleccionadas primero también al buscar', (): void => {
    const marcas: readonly Marca[] = [
      createMarca(1, 'Natural Zeta'),
      createMarca(2, 'Natural Alfa'),
      createMarca(3, 'Otra'),
    ];

    expect(
      filterProveedorMarcas(marcas, [1], 'natural').map((marca: Marca): string => marca.nombre),
    ).toEqual(['Natural Zeta', 'Natural Alfa']);
  });
});

function createMarca(id: number, nombre: string): Marca {
  const marca: Marca = new Marca();

  marca.id = id;
  marca.publicId = `marca-${id}`;
  marca.nombre = nombre;

  return marca;
}
