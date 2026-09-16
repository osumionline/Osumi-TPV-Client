import Proveedor from '@model/proveedores/proveedor.model';
import { filterProveedores } from '@modules/compras/proveedores/components/proveedor-search/proveedor-search.component.private';
import { describe, expect, it } from 'vitest';

describe('proveedor-search.component.private', (): void => {
  it('devuelve todos los Proveedores cuando no existe búsqueda', (): void => {
    const proveedores: readonly Proveedor[] = [
      createProveedor(1, 'Distribuciones Norte'),
      createProveedor(2, 'Almacenes Bilbao'),
    ];

    expect(filterProveedores(proveedores, '')).toEqual(proveedores);

    expect(filterProveedores(proveedores, '   ')).toEqual(proveedores);
  });

  it('filtra por nombre ignorando mayúsculas y diacríticos', (): void => {
    const proveedores: readonly Proveedor[] = [
      createProveedor(1, 'Árbol Distribuciones'),
      createProveedor(2, 'Comercial Norte'),
      createProveedor(3, 'Suministros Bilbao'),
    ];

    expect(
      filterProveedores(proveedores, 'ARBOL').map(
        (proveedor: Proveedor): string => proveedor.nombre,
      ),
    ).toEqual(['Árbol Distribuciones']);

    expect(
      filterProveedores(proveedores, 'norte').map(
        (proveedor: Proveedor): string => proveedor.nombre,
      ),
    ).toEqual(['Comercial Norte']);
  });

  it('devuelve una lista vacía cuando no encuentra coincidencias', (): void => {
    const proveedores: readonly Proveedor[] = [
      createProveedor(1, 'Distribuciones Norte'),
      createProveedor(2, 'Almacenes Bilbao'),
    ];

    expect(filterProveedores(proveedores, 'inexistente')).toEqual([]);
  });
});

/**
 * Construye un Proveedor persistido
 * representativo para las pruebas.
 */
function createProveedor(id: number, nombre: string): Proveedor {
  const proveedor: Proveedor = new Proveedor();

  proveedor.id = id;
  proveedor.publicId = `proveedor-${id}`;
  proveedor.nombre = nombre;

  return proveedor;
}
