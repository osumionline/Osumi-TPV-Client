import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';

export default interface CategoriasApi {
  getAll(): Promise<readonly CategoriaInterface[]>;
}
