import type CategoriaInterface from '@desktop-contracts/articulos/categorias/categoria.interface';

export default interface CategoriasApi {
  getAll(): Promise<readonly CategoriaInterface[]>;
}
